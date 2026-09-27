import test from 'node:test';
import assert from 'node:assert/strict';
import { markFailed, markDeadLetter, getRetryCount } from '../src/pipeline/eventStore.js';
import { BaseAgent } from '../src/pipeline/agents/baseAgent.js';
import { env } from '../src/config/env.js';
import type { PipelineEvent } from '../src/pipeline/types.js';

type DbRow = Record<string, unknown>;

interface FakeResult {
  rows: DbRow[];
  rowCount: number;
}

interface QueryCall {
  text: string;
  params: unknown[] | undefined;
}

type PoolHandler = (text: string, params: unknown[] | undefined) => FakeResult;

let calls: QueryCall[] = [];

/**
 * Installs a recording fake pool on globalThis.pgPool. src/db/index.ts
 * getPool() returns an existing globalThis.pgPool as-is, so no real DB
 * connection is opened.
 */
function installRecorderPool(handler: PoolHandler): void {
  calls = [];
  (globalThis as unknown as { pgPool: unknown }).pgPool = {
    query: async (text: string, params?: unknown[]): Promise<FakeResult> => {
      const result = handler(text, params);
      calls.push({ text, params });
      return result;
    },
  };
}

function makeTask(): PipelineEvent {
  return {
    id: 1,
    run_id: '00000000-0000-0000-0000-000000000000',
    agent_type: 'ingestion',
    event_type: 'task',
    status: 'pending',
    payload: {},
    error_message: null,
    retry_count: 0,
    failed_at: null,
    dead_lettered_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    locked_at: null,
    locked_by: null,
  };
}

test('markFailed increments retry_count, sets failed_at, and returns the new count', async () => {
  installRecorderPool((text) => {
    if (text.includes('retry_count = retry_count + 1')) {
      return { rows: [{ retry_count: 2 }], rowCount: 1 };
    }
    throw new Error(`unexpected query: ${text}`);
  });

  const retryCount = await markFailed(42, 'boom');

  assert.equal(retryCount, 2);
  assert.equal(calls.length, 1);
  const [call] = calls;
  assert.match(call.text, /SET status = 'failed'/);
  assert.match(call.text, /failed_at = NOW\(\)/);
  assert.match(call.text, /retry_count = retry_count \+ 1/);
  assert.match(call.text, /RETURNING retry_count/);
  assert.deepEqual(call.params, [42, 'boom']);
});

test('markDeadLetter only transitions from failed or running', async () => {
  // Transition allowed (row matched by the status guard).
  installRecorderPool((text) => {
    if (text.includes("status IN ('failed', 'running')")) {
      return { rows: [{ id: 7 }], rowCount: 1 };
    }
    throw new Error(`unexpected query: ${text}`);
  });

  const transitioned = await markDeadLetter(7, 'retries exhausted');

  assert.equal(transitioned, true);
  const [call] = calls;
  assert.match(call.text, /SET status = 'dead_letter'/);
  assert.match(call.text, /dead_lettered_at = NOW\(\)/);
  assert.match(call.text, /WHERE id = \$1 AND status IN \('failed', 'running'\)/);
  assert.deepEqual(call.params, [7, 'retries exhausted']);

  // No transition (row is completed or pending, so the guard matches nothing).
  installRecorderPool(() => ({ rows: [], rowCount: 0 }));
  assert.equal(await markDeadLetter(9, 'retries exhausted'), false);
});

test('getRetryCount reads the persisted retry_count', async () => {
  installRecorderPool((text) => {
    assert.match(text, /SELECT retry_count FROM pipeline_events WHERE id = \$1/);
    return { rows: [{ retry_count: 5 }], rowCount: 1 };
  });

  assert.equal(await getRetryCount(3), 5);
});

class ExplodingAgent extends BaseAgent {
  readonly agentType = 'ingestion' as const;

  protected async executeTask(): Promise<Record<string, unknown>> {
    throw new Error('worker exploded');
  }
}

function baseAgentHandler(retryCount: number): PoolHandler {
  return (text) => {
    if (text.includes('FOR UPDATE SKIP LOCKED')) {
      return { rows: [makeTask() as unknown as DbRow], rowCount: 1 };
    }
    if (text.includes('retry_count = retry_count + 1')) {
      return { rows: [{ retry_count: retryCount }], rowCount: 1 };
    }
    if (text.includes("SET status = 'dead_letter'")) {
      return { rows: [{ id: 1 }], rowCount: 1 };
    }
    throw new Error(`unexpected query: ${text}`);
  };
}

test('baseAgent dead-letters the task once retry_count reaches PIPELINE_MAX_RETRIES', async () => {
  installRecorderPool(baseAgentHandler(env.PIPELINE_MAX_RETRIES));

  const exitCode = await new ExplodingAgent().runOnce();

  assert.equal(exitCode, 1);
  assert.ok(
    calls.some((call) => call.text.includes("SET status = 'dead_letter'")),
    'expected the exhausted task to be dead-lettered'
  );
});

test('baseAgent leaves the task in failed when retries remain', async () => {
  installRecorderPool(baseAgentHandler(env.PIPELINE_MAX_RETRIES - 1));

  const exitCode = await new ExplodingAgent().runOnce();

  assert.equal(exitCode, 1);
  assert.ok(
    calls.some((call) => call.text.includes('retry_count = retry_count + 1')),
    'expected markFailed to run'
  );
  assert.ok(
    !calls.some((call) => call.text.includes("SET status = 'dead_letter'")),
    'task below the retry threshold must not be dead-lettered'
  );
});
