import test from 'node:test';
import assert from 'node:assert/strict';
import { callLlmWithCache } from '../src/services/llmWithCache.js';

interface CacheRow {
  model: string;
  response: unknown;
  prompt_tokens: number | null;
  completion_tokens: number | null;
}

let store = new Map<string, CacheRow>();
let usageInserts: unknown[][] = [];

/** In-memory stand-ins for the llm_cache and llm_usage tables (pgPool seam). */
function installFakePool(): void {
  store = new Map();
  usageInserts = [];

  (globalThis as unknown as { pgPool: unknown }).pgPool = {
    query: async (text: string, params?: unknown[]) => {
      if (text.includes('INSERT INTO llm_usage')) {
        usageInserts.push(params ?? []);
        return { rows: [], rowCount: 1 };
      }

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

function captureConsoleLog(): { logs: string[]; restore: () => void } {
  const logs: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    logs.push(args.map((arg) => String(arg)).join(' '));
  };
  return { logs, restore: () => { console.log = original; } };
}

interface FakeGateway {
  calls: number;
  invoke: () => Promise<{
    response: Array<{ title: string }>;
    model: string;
    usage?: { promptTokens?: number; completionTokens?: number };
  }>;
}

function makeGateway(): FakeGateway {
  const gateway: FakeGateway = {
    calls: 0,
    invoke: async () => {
      gateway.calls += 1;
      return {
        response: [{ title: 'Solar Microgrid' }],
        model: 'fake-model',
        usage: { promptTokens: 10, completionTokens: 20 },
      };
    },
  };
  return gateway;
}

test('llmWithCache - first call hits the gateway, writes the cache, and logs a miss', async () => {
  installFakePool();
  const gateway = makeGateway();
  const { logs, restore } = captureConsoleLog();

  let result: { response: Array<{ title: string }>; cached: boolean };
  try {
    result = await callLlmWithCache<Array<{ title: string }>>({
      agentType: 'opportunity',
      eventId: 7,
      payload: { clusterId: 1, title: 'Solar' },
      call: () => gateway.invoke(),
    });
  } finally {
    restore();
  }

  assert.equal(result!.cached, false);
  assert.equal(gateway.calls, 1);
  assert.deepEqual(result!.response, [{ title: 'Solar Microgrid' }]);
  assert.equal(store.size, 1);
  assert.ok(logs.some((line) => line.includes('llm_cache=miss')), 'expected a miss log');

  // llm_usage: [event_id, agent_type, model, prompt_tokens, completion_tokens, cost_usd, cached]
  assert.equal(usageInserts.length, 1);
  const usage = usageInserts[0];
  assert.equal(usage[0], 7);
  assert.equal(usage[1], 'opportunity');
  assert.equal(usage[2], 'fake-model');
  assert.equal(usage[3], 10);
  assert.equal(usage[4], 20);
  assert.equal(usage[6], false, 'a miss must be recorded with cached: false');
});

test('llmWithCache - identical payload is served from cache and logged as a hit', async () => {
  installFakePool();
  const gateway = makeGateway();
  const payload = { clusterId: 1, title: 'Solar' };

  const first = await callLlmWithCache<Array<{ title: string }>>({
    agentType: 'opportunity',
    eventId: 7,
    payload,
    call: () => gateway.invoke(),
  });

  const { logs, restore } = captureConsoleLog();
  let second: { response: Array<{ title: string }>; cached: boolean };
  try {
    second = await callLlmWithCache<Array<{ title: string }>>({
      agentType: 'opportunity',
      eventId: 8,
      payload,
      call: () => gateway.invoke(),
    });
  } finally {
    restore();
  }

  assert.equal(first.cached, false);
  assert.equal(second!.cached, true);
  assert.equal(gateway.calls, 1, 'gateway must not be invoked on a cache hit');
  assert.deepEqual(second!.response, [{ title: 'Solar Microgrid' }]);
  assert.ok(logs.some((line) => line.includes('llm_cache=hit')), 'expected a hit log');
  assert.ok(logs.some((line) => /key=[0-9a-f]{8}$/.test(line)), 'expected a short key in the log');

  // Both invocations are recorded; the hit is a zero-cost cached row.
  assert.equal(usageInserts.length, 2);
  const hit = usageInserts[1];
  assert.equal(hit[0], 8);
  assert.equal(hit[1], 'opportunity');
  assert.equal(hit[2], 'fake-model');
  assert.equal(hit[3], 0);
  assert.equal(hit[4], 0);
  assert.equal(hit[5], '0.000000', 'a cache hit costs nothing');
  assert.equal(hit[6], true, 'a hit must be recorded with cached: true');
});

test('llmWithCache - a different payload misses and calls the gateway again', async () => {
  installFakePool();
  const gateway = makeGateway();

  const first = await callLlmWithCache<Array<{ title: string }>>({
    agentType: 'opportunity',
    payload: { clusterId: 1 },
    call: () => gateway.invoke(),
  });
  const second = await callLlmWithCache<Array<{ title: string }>>({
    agentType: 'opportunity',
    payload: { clusterId: 2 },
    call: () => gateway.invoke(),
  });

  assert.equal(first.cached, false);
  assert.equal(second.cached, false);
  assert.equal(gateway.calls, 2);
  assert.equal(store.size, 2);
  assert.equal(usageInserts.length, 2);
  assert.deepEqual(usageInserts.map((row) => row[6]), [false, false]);
});
