import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalize, hashPayload, buildKey, getCached, setCached } from '../src/pipeline/llmCache.js';

interface CacheRow {
  model: string;
  response: unknown;
  prompt_tokens: number | null;
  completion_tokens: number | null;
}

interface RecordedQuery {
  text: string;
  params: unknown[] | undefined;
}

let queries: RecordedQuery[] = [];
let store = new Map<string, CacheRow>();

/** Minimal in-memory stand-in for the llm_cache table, via the pgPool seam. */
function installCachePool(): void {
  queries = [];
  store = new Map();

  (globalThis as unknown as { pgPool: unknown }).pgPool = {
    query: async (text: string, params?: unknown[]) => {
      queries.push({ text, params });

      if (text.includes('INSERT INTO llm_cache')) {
        const [key, model, , response, promptTokens, completionTokens] = params as [
          string,
          string,
          string,
          string,
          number | null,
          number | null,
        ];
        if (!store.has(key)) {
          store.set(key, {
            model,
            response: JSON.parse(response),
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
          });
        }
        return { rows: [], rowCount: 1 };
      }

      if (text.includes('FROM llm_cache')) {
        const row = store.get(params?.[0] as string);
        return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
      }

      throw new Error(`unexpected query: ${text}`);
    },
  };
}

test('canonicalize - equal payloads with different key order serialize identically', () => {
  assert.equal(canonicalize({ b: 1, a: 2 }), canonicalize({ a: 2, b: 1 }));
  assert.equal(canonicalize({ b: 1, a: 2 }), '{"a":2,"b":1}');
  assert.equal(canonicalize([{ y: 1, x: 2 }]), '[{"x":2,"y":1}]');
  assert.equal(canonicalize(new Date('2026-01-01T00:00:00.000Z')), '"2026-01-01T00:00:00.000Z"');
  assert.equal(canonicalize([3, 'a', null]), '[3,"a",null]');
});

test('hashPayload / buildKey - stable, payload-sensitive, and namespaced', () => {
  assert.equal(
    hashPayload({ a: [1, 2, { c: 3, b: 4 }] }),
    hashPayload({ a: [1, 2, { b: 4, c: 3 }] })
  );
  assert.equal(hashPayload({ a: 1 }), hashPayload({ a: 1 }));
  assert.notEqual(hashPayload({ a: 1 }), hashPayload({ a: 2 }));

  assert.equal(buildKey('opportunity', { a: 1 }).length, 64);
  assert.equal(buildKey('opportunity', { a: 1 }), buildKey('opportunity', { a: 1 }));
  assert.notEqual(buildKey('opportunity', { a: 1 }), buildKey('ingestion', { a: 1 }));
});

test('getCached - returns null when the table has no matching row', async () => {
  installCachePool();

  const hit = await getCached('missing-key');

  assert.equal(hit, null);
  assert.equal(queries.length, 1);
  assert.match(queries[0].text, /FROM llm_cache/);
});

test('setCached - inserts with ON CONFLICT DO NOTHING and round-trips', async () => {
  installCachePool();

  await setCached('k1', 'cohere-command-r-08-2024', 'prompt-hash', { ok: true }, { promptTokens: 3, completionTokens: 4 });

  assert.equal(queries.length, 1);
  assert.match(queries[0].text, /ON CONFLICT \(idempotency_key\) DO NOTHING/);
  assert.deepEqual(queries[0].params, [
    'k1',
    'cohere-command-r-08-2024',
    'prompt-hash',
    JSON.stringify({ ok: true }),
    3,
    4,
  ]);

  const hit = await getCached('k1');
  assert.deepEqual(hit, {
    model: 'cohere-command-r-08-2024',
    response: { ok: true },
    promptTokens: 3,
    completionTokens: 4,
  });
});

test('setCached - an existing key is left untouched (first writer wins)', async () => {
  installCachePool();

  await setCached('k1', 'model-a', 'hash-a', { v: 1 });
  await setCached('k1', 'model-b', 'hash-b', { v: 2 });

  assert.equal(store.size, 1);
  assert.deepEqual(store.get('k1')?.response, { v: 1 });
});

test('LLM_CACHE_ENABLED=false - getCached returns null and setCached is a no-op', async () => {
  installCachePool();
  const previous = process.env.LLM_CACHE_ENABLED;
  process.env.LLM_CACHE_ENABLED = 'false';

  try {
    assert.equal(await getCached('k1'), null);
    await setCached('k1', 'model', 'hash', { v: 1 });

    assert.equal(queries.length, 0, 'disabled cache must not touch the database');
    assert.equal(store.size, 0);
  } finally {
    if (previous === undefined) delete process.env.LLM_CACHE_ENABLED;
    else process.env.LLM_CACHE_ENABLED = previous;
  }
});
