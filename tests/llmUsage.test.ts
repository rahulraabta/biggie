import test from 'node:test';
import assert from 'node:assert/strict';
import { PRICING, computeCostUsd, recordUsage } from '../src/pipeline/llmUsage.js';

interface RecordedQuery {
  text: string;
  params: unknown[] | undefined;
}

let queries: RecordedQuery[] = [];

type PoolHandler = (text: string, params?: unknown[]) => { rows: unknown[]; rowCount: number };

function installPool(handler?: PoolHandler): void {
  queries = [];
  (globalThis as unknown as { pgPool: unknown }).pgPool = {
    query: async (text: string, params?: unknown[]) => {
      queries.push({ text, params });
      return handler ? handler(text, params) : { rows: [], rowCount: 1 };
    },
  };
}

test('computeCostUsd - prices known models from the PRICING table', () => {
  assert.equal(computeCostUsd('qwen/qwen3.8-max', 1_000_000, 1_000_000), 3);
  assert.equal(computeCostUsd('qwen/qwen3.8-max', 0, 0), 0);
  assert.equal(computeCostUsd('command-r-08-2024', 1_000_000, 0), 0.15);
  assert.equal(computeCostUsd('command-r-plus-08-2024', 1_000_000, 1_000_000), 12.5);
});

test('computeCostUsd - unknown model falls back to default pricing', () => {
  assert.equal(PRICING.default.inputPer1M, 1);
  assert.equal(PRICING.default.outputPer1M, 4);
  assert.equal(computeCostUsd('unknown-model', 1_000_000, 0), 1);
  assert.equal(computeCostUsd('unknown-model', 0, 1_000_000), 4);
  assert.equal(computeCostUsd('', 0, 0), 0);
});

test('recordUsage - inserts a full usage row with the derived cost', async () => {
  installPool();

  await recordUsage({
    eventId: 42,
    agentType: 'opportunity',
    model: 'qwen/qwen3.8-max',
    promptTokens: 1000,
    completionTokens: 500,
    cached: false,
  });

  assert.equal(queries.length, 1);
  assert.match(queries[0].text, /INSERT INTO llm_usage/);

  const params = queries[0].params as unknown[];
  assert.equal(params[0], 42);
  assert.equal(params[1], 'opportunity');
  assert.equal(params[2], 'qwen/qwen3.8-max');
  assert.equal(params[3], 1000);
  assert.equal(params[4], 500);
  assert.equal(params[5], '0.001800'); // (1000*0.60 + 500*2.40) / 1e6
  assert.equal(params[6], false);
});

test('recordUsage - DB error is logged to stderr and swallowed', async () => {
  installPool(() => {
    throw new Error('relation "llm_usage" does not exist');
  });

  const errors: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args.map((arg) => String(arg)).join(' '));
  };

  try {
    await recordUsage({
      agentType: 'opportunity',
      model: 'qwen/qwen3.8-max',
      promptTokens: 1,
      completionTokens: 1,
      cached: false,
    });
  } finally {
    console.error = original;
  }

  const output = errors.join('\n');
  assert.match(output, /Failed to record LLM usage/);
  assert.match(output, /does not exist/);
});
