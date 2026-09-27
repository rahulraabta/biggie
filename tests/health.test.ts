import test from 'node:test';
import assert from 'node:assert/strict';
import { GET as getPipelineHealth } from '../app/api/health/pipeline/route.js';

type DbRow = Record<string, unknown>;

interface FakeQueryResult {
  rows: DbRow[];
  rowCount: number;
}

type QueryResponder = (text: string) => DbRow[];

interface HealthBody {
  status: 'healthy' | 'degraded' | 'unhealthy';
  queue: Record<string, number>;
  oldestPendingAgeMs: number;
  perAgent: Record<string, Record<string, number>>;
  checkedAt: string;
  error?: string;
}

const AGENTS = ['ingestion', 'clustering', 'opportunity'] as const;
const QUEUE_KEYS = ['pending', 'processing', 'completed', 'failed', 'dead_letter', 'completed24h'] as const;

/**
 * Installs a fake pool on globalThis.pgPool. src/db/index.ts getPool() returns
 * an existing globalThis.pgPool as-is, so no real Neon connection is opened.
 */
function installFakePool(responder: QueryResponder | Error): void {
  const pool = {
    query: async (text: string): Promise<FakeQueryResult> => {
      if (responder instanceof Error) throw responder;
      const rows = responder(text);
      return { rows, rowCount: rows.length };
    },
  };
  (globalThis as unknown as { pgPool: unknown }).pgPool = pool;
}

function respond(
  totals: DbRow[],
  perAgent: DbRow[] = [],
  ageMs: number | null = null
): QueryResponder {
  return (text) => {
    if (text.includes('GROUP BY status')) return totals;
    if (text.includes('GROUP BY agent_type')) return perAgent;
    if (text.includes('MIN(created_at)')) return [{ age_ms: ageMs }];
    throw new Error(`Unexpected query in health test: ${text}`);
  };
}

async function callHealth(): Promise<{ httpStatus: number; body: HealthBody }> {
  const res = await getPipelineHealth();
  return { httpStatus: res.status, body: (await res.json()) as HealthBody };
}

function assertShape(body: HealthBody): void {
  assert.ok(['healthy', 'degraded', 'unhealthy'].includes(body.status));
  for (const key of QUEUE_KEYS) {
    assert.equal(typeof body.queue[key], 'number', `queue.${key} should be a number`);
  }
  assert.equal(typeof body.oldestPendingAgeMs, 'number');
  for (const agent of AGENTS) {
    for (const key of ['pending', 'failed', 'completed24h']) {
      assert.equal(typeof body.perAgent[agent][key], 'number', `perAgent.${agent}.${key}`);
    }
  }
  assert.equal(new Date(body.checkedAt).toISOString(), body.checkedAt);
}

test('GET /api/health/pipeline - all-zero queue is healthy (200)', async () => {
  installFakePool(respond([], [], null));

  const { httpStatus, body } = await callHealth();

  assert.equal(httpStatus, 200);
  assert.equal(body.status, 'healthy');
  assert.deepEqual(body.queue, {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    dead_letter: 0,
    completed24h: 0,
  });
  assert.equal(body.oldestPendingAgeMs, 0);
  assertShape(body);
});

test('GET /api/health/pipeline - one failed event is degraded (200)', async () => {
  installFakePool(respond([{ status: 'failed', count: 1 }]));

  const { httpStatus, body } = await callHealth();

  assert.equal(httpStatus, 200);
  assert.equal(body.status, 'degraded');
  assert.equal(body.queue.failed, 1);
  assertShape(body);
});

test('GET /api/health/pipeline - fifteen failed events is unhealthy (503)', async () => {
  installFakePool(respond([{ status: 'failed', count: 15 }]));

  const { httpStatus, body } = await callHealth();

  assert.equal(httpStatus, 503);
  assert.equal(body.status, 'unhealthy');
  assert.equal(body.queue.failed, 15);
  assertShape(body);
});

test('GET /api/health/pipeline - stale pending queue escalates by age', async () => {
  installFakePool(respond([{ status: 'pending', count: 1 }], [], 700_000));
  const degraded = await callHealth();
  assert.equal(degraded.httpStatus, 200);
  assert.equal(degraded.body.status, 'degraded');
  assert.equal(degraded.body.oldestPendingAgeMs, 700_000);

  installFakePool(respond([{ status: 'pending', count: 1 }], [], 2_000_000));
  const unhealthy = await callHealth();
  assert.equal(unhealthy.httpStatus, 503);
  assert.equal(unhealthy.body.status, 'unhealthy');
  assert.equal(unhealthy.body.oldestPendingAgeMs, 2_000_000);
});

test('GET /api/health/pipeline - maps running to processing and aggregates per-agent 24h', async () => {
  installFakePool(respond(
    [
      { status: 'running', count: 2 },
      { status: 'completed', count: 4 },
    ],
    [
      { agent_type: 'ingestion', pending: 3, failed: 1, completed_24h: 5 },
      { agent_type: 'unknown-agent', pending: 9, failed: 9, completed_24h: 9 },
    ]
  ));

  const { httpStatus, body } = await callHealth();

  assert.equal(httpStatus, 200);
  assert.equal(body.status, 'healthy');
  assert.equal(body.queue.processing, 2);
  assert.equal(body.queue.completed, 4);
  assert.equal(body.queue.completed24h, 5);
  assert.deepEqual(body.perAgent.ingestion, { pending: 3, failed: 1, completed24h: 5 });
  assert.deepEqual(body.perAgent.opportunity, { pending: 0, failed: 0, completed24h: 0 });
  assertShape(body);
});

test('GET /api/health/pipeline - DB failure returns 503 db_error', async () => {
  installFakePool(new Error('connection refused'));

  const { httpStatus, body } = await callHealth();

  assert.equal(httpStatus, 503);
  assert.equal(body.status, 'unhealthy');
  assert.equal(body.error, 'db_error');
});
