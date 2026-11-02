import { pathToFileURL } from 'node:url';
import { getPool, query, closePool } from '@/src/db/index';

export type AgentFilter = 'ingestion' | 'clustering' | 'opportunity' | 'all';

export interface RequeueOptions {
  since: string;
  until: string;
  agent: AgentFilter;
  limit: number;
  dryRun: boolean;
  reason?: string;
}

const AGENT_FILTERS: readonly AgentFilter[] = ['ingestion', 'clustering', 'opportunity', 'all'];

export const COUNT_SQL = `
  SELECT COUNT(*)::int AS count
  FROM pipeline_events
  WHERE status = 'dead_letter'
    AND dead_lettered_at >= $1 AND dead_lettered_at < $2
    AND ($3 = 'all' OR agent_type = $3)`;

export const UPDATE_SQL = `
  UPDATE pipeline_events
  SET status = 'pending',
      retry_count = 0,
      error_message = NULL,
      failed_at = NULL,
      dead_lettered_at = NULL,
      locked_at = NULL,
      locked_by = NULL,
      updated_at = NOW()
  WHERE id IN (
    SELECT id FROM pipeline_events
    WHERE status = 'dead_letter'
      AND dead_lettered_at >= $1 AND dead_lettered_at < $2
      AND ($3 = 'all' OR agent_type = $3)
    ORDER BY dead_lettered_at ASC
    LIMIT $4
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id, agent_type`;

const USAGE = `Usage: node --import tsx scripts/requeue-dead-letter.ts --since=<ISO> [options]

Requeue dead-lettered pipeline_events back to 'pending'.

Options:
  --since=<ISO>   (required) inclusive lower bound on dead_lettered_at
  --until=<ISO>   exclusive upper bound on dead_lettered_at (default: now)
  --agent=<name>  ingestion | clustering | opportunity | all (default: all)
  --limit=<N>     max rows to requeue (default: 100)
  --dry-run       count matches without requeueing
  --reason=<text> free-form note, logged only`;

export function printUsage(): void {
  console.error(USAGE);
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

/** Returns null when the flags are missing or invalid (caller prints usage). */
export function parseArgs(argv: string[]): RequeueOptions | null {
  let since: string | undefined;
  let until: string | undefined;
  let agent: AgentFilter = 'all';
  let limit = 100;
  let dryRun = false;
  let reason: string | undefined;

  for (const arg of argv) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg.startsWith('--since=')) since = arg.slice('--since='.length);
    else if (arg.startsWith('--until=')) until = arg.slice('--until='.length);
    else if (arg.startsWith('--agent=')) agent = arg.slice('--agent='.length) as AgentFilter;
    else if (arg.startsWith('--limit=')) limit = Number.parseInt(arg.slice('--limit='.length), 10);
    else if (arg.startsWith('--reason=')) reason = stripQuotes(arg.slice('--reason='.length));
  }

  if (!since || Number.isNaN(Date.parse(since))) return null;
  if (until !== undefined && Number.isNaN(Date.parse(until))) return null;
  if (!AGENT_FILTERS.includes(agent)) return null;
  if (!Number.isFinite(limit) || limit <= 0) return null;

  return {
    since,
    until: until ?? new Date().toISOString(),
    agent,
    limit,
    dryRun,
    reason,
  };
}

interface RequeuedRow {
  id: number;
  agent_type: string;
}

export async function runRequeue(argv: string[]): Promise<void> {
  const options = parseArgs(argv);
  if (!options) {
    printUsage();
    process.exit(1);
  }

  const countRes = await query<{ count: number }>(COUNT_SQL, [
    options.since,
    options.until,
    options.agent,
  ]);
  const matched = Number(countRes.rows[0]?.count ?? 0);

  if (options.dryRun) {
    console.log(`Matched: ${matched} | Would requeue: ${matched}`);
    return;
  }

  const params = [options.since, options.until, options.agent, options.limit];
  const client = await getPool().connect();
  let requeued: RequeuedRow[] = [];
  try {
    await client.query('BEGIN');
    const res = await client.query<RequeuedRow>(UPDATE_SQL, params);
    requeued = res.rows;
    await client.query('COMMIT');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore rollback failures; the original error is more useful
    }
    throw err;
  } finally {
    client.release();
  }

  console.log(
    `Matched: ${matched} | Requeued: ${requeued.length} | Skipped: ${matched - requeued.length}`
  );
  console.log(`Requeued ids: ${requeued.map((row) => row.id).join(', ')}`);
  if (options.reason) console.log(`Reason: ${options.reason}`);
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  await runRequeue(argv);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    try {
      await main();
    } catch (err) {
      console.error('[requeue-dead-letter] Failed:', err);
      process.exitCode = 1;
    } finally {
      await closePool().catch(() => undefined);
    }
  })();
}
