import { NextResponse } from 'next/server';
import { query } from '@/src/db/index';

export const dynamic = 'force-dynamic';

export type PipelineHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export type PipelineAgentType = 'ingestion' | 'clustering' | 'opportunity';

export interface PipelineQueueCounts {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  dead_letter: number;
  completed24h: number;
}

export interface PipelineAgentCounts {
  pending: number;
  failed: number;
  completed24h: number;
}

export interface PipelineHealthResponse {
  status: PipelineHealthStatus;
  queue: PipelineQueueCounts;
  oldestPendingAgeMs: number;
  perAgent: Record<PipelineAgentType, PipelineAgentCounts>;
  checkedAt: string;
}

const AGENT_TYPES = ['ingestion', 'clustering', 'opportunity'] as const;

/** failed + dead_letter above this count is unhealthy. */
const UNHEALTHY_FAILED_THRESHOLD = 10;
/** A pending event older than this is unhealthy. */
const UNHEALTHY_PENDING_AGE_MS = 1_800_000;
/** A pending event older than this is degraded. */
const DEGRADED_PENDING_AGE_MS = 600_000;

type StatusTotalRow = { status: string; count: number };
type AgentTotalRow = {
  agent_type: string;
  pending: number;
  failed: number;
  completed_24h: number;
};
type OldestPendingRow = { age_ms: number | string | null };

function emptyQueue(): PipelineQueueCounts {
  return { pending: 0, running: 0, completed: 0, failed: 0, dead_letter: 0, completed24h: 0 };
}

function emptyPerAgent(): Record<PipelineAgentType, PipelineAgentCounts> {
  return {
    ingestion: { pending: 0, failed: 0, completed24h: 0 },
    clustering: { pending: 0, failed: 0, completed24h: 0 },
    opportunity: { pending: 0, failed: 0, completed24h: 0 },
  };
}

/** Coerce a pg result (COUNT ::int -> number, EXTRACT -> numeric string) to a non-negative int. */
function toCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

export async function GET(): Promise<NextResponse> {
  try {
    // Query A - totals per status.
    const totals = await query<StatusTotalRow>(
      `SELECT status, COUNT(*)::int AS count
       FROM pipeline_events
       GROUP BY status`
    );

    // Query B - per-agent breakdown incl. completions in the last 24h.
    const perAgentRows = await query<AgentTotalRow>(
      `SELECT
         agent_type,
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
         COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
         COUNT(*) FILTER (
           WHERE status = 'completed' AND updated_at > now() - interval '24 hours'
         )::int AS completed_24h
       FROM pipeline_events
       GROUP BY agent_type`
    );

    // Query B (cont.) - age of the oldest pending event (NULL when none).
    const oldest = await query<OldestPendingRow>(
      `SELECT EXTRACT(EPOCH FROM (now() - MIN(created_at))) * 1000 AS age_ms
       FROM pipeline_events
       WHERE status = 'pending'`
    );

    const queue = emptyQueue();
    for (const row of totals.rows) {
      const count = toCount(row.count);
      switch (row.status) {
        case 'pending':
          queue.pending += count;
          break;
        case 'running':
          queue.running += count;
          break;
        case 'completed':
          queue.completed += count;
          break;
        case 'failed':
          queue.failed += count;
          break;
        case 'dead_letter':
          queue.dead_letter += count;
          break;
        default:
          break;
      }
    }

    const perAgent = emptyPerAgent();
    for (const row of perAgentRows.rows) {
      if (!(AGENT_TYPES as readonly string[]).includes(row.agent_type)) continue;
      const agent = row.agent_type as PipelineAgentType;
      const completed24h = toCount(row.completed_24h);
      perAgent[agent] = {
        pending: toCount(row.pending),
        failed: toCount(row.failed),
        completed24h,
      };
      queue.completed24h += completed24h;
    }

    // No pending events at all -> MIN(created_at) is NULL -> age is 0.
    const oldestPendingAgeMs = toCount(oldest.rows[0]?.age_ms);

    const failedTotal = queue.failed + queue.dead_letter;
    let status: PipelineHealthStatus = 'healthy';
    if (failedTotal > UNHEALTHY_FAILED_THRESHOLD || oldestPendingAgeMs > UNHEALTHY_PENDING_AGE_MS) {
      status = 'unhealthy';
    } else if (failedTotal > 0 || oldestPendingAgeMs > DEGRADED_PENDING_AGE_MS) {
      status = 'degraded';
    }

    const body: PipelineHealthResponse = {
      status,
      queue,
      oldestPendingAgeMs,
      perAgent,
      checkedAt: new Date().toISOString(),
    };

    return NextResponse.json(body, { status: status === 'unhealthy' ? 503 : 200 });
  } catch (err) {
    console.error('[Pipeline Health] query failed:', err);
    return NextResponse.json({ status: 'unhealthy', error: 'db_error' }, { status: 503 });
  }
}
