import test from 'node:test';
import assert from 'node:assert/strict';
import type pg from 'pg';
import { loadRelevanceConfig } from '../src/config/relevanceConfig';
import { pendingGdeltExports, insertNewGdeltEvents } from '../src/services/gdeltStream';
import { runGdeltPoll } from '../src/services/gdeltWorker';
import { applyOpportunitySnapshot } from '../src/utils/opportunityUpdates';
import type { OpportunityResponseItem } from '../app/api/opportunities/route';
import type { GdeltEvent } from '../src/services/relevanceEngine';
import { getPool } from '../src/db/index';
import { GET as getHeatmap } from '../app/api/map/heatmap/route';

function database(query: (sql: string, values?: unknown[]) => Promise<{ rows: unknown[] }>) {
  return { query } as unknown as Pick<pg.Client, 'query'>;
}

const latest = 'https://data.gdeltproject.org/gdeltv2/20261101120000.export.CSV.zip';
const event: GdeltEvent = {
  globalEventId: '123', date: '20261101', actor1: 'Energy investment', actor2: '',
  eventCode: '071', goldsteinScale: 5, numMentions: 10, avgTone: 0,
  actionCountryCode: 'IN', sourceUrl: 'https://example.com/energy-investment',
};
const config = { ...loadRelevanceConfig(), minRelevanceScore: 0, minNumMentions: 1 };

test('export recovery starts after the checkpoint and includes the latest export', () => {
  assert.deepEqual(pendingGdeltExports(latest, null), [latest]);
  assert.deepEqual(pendingGdeltExports(latest, '2026-11-01T11:30:00Z'), [
    latest.replace('120000', '114500'), latest,
  ]);
  assert.deepEqual(pendingGdeltExports(latest, '2026-11-01T12:00:00Z'), []);
  assert.equal(pendingGdeltExports(latest, '2026-10-01T12:00:00Z').length, 96);
});

test('event ledger admits each event once and preserves the export publication time', async () => {
  const seen = new Set<string>();
  const inserts: unknown[][] = [];
  const client = database(async (sql, values) => {
    if (sql.includes('INSERT INTO gdelt_seen_events')) {
      const ids = (values![0] as string[]).filter((id) => !seen.has(id));
      ids.forEach((id) => seen.add(id));
      return { rows: ids.map((external_id) => ({ external_id })) };
    }
    if (sql.includes('INSERT INTO articles')) {
      inserts.push(values!);
      assert.match(sql, /ON CONFLICT DO NOTHING/);
      return { rows: [{ is_inserted: true }] };
    }
    return { rows: [] };
  });
  const publishedAt = '2026-11-01T12:00:00Z';
  assert.equal(await insertNewGdeltEvents(client, [event, event], config, publishedAt), 1);
  assert.equal(await insertNewGdeltEvents(client, [event], config, publishedAt), 0);
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0][4], publishedAt);
});

test('failed article insertion rolls back its event ledger claim', async () => {
  const calls: string[] = [];
  const client = database(async (sql) => {
    calls.push(sql);
    if (sql.includes('INSERT INTO gdelt_seen_events')) return { rows: [{ external_id: event.globalEventId }] };
    if (sql.includes('INSERT INTO articles')) throw new Error('database failure');
    return { rows: [] };
  });
  await assert.rejects(insertNewGdeltEvents(client, [event], config, '2026-11-01T12:00:00Z'), /database failure/);
  assert.equal(calls.at(-1), 'ROLLBACK');
  assert.ok(!calls.includes('COMMIT'));
});

test('ingestion never inserts articles rejected by score or topic filters', async () => {
  const calls: string[] = [];
  const client = database(async (sql) => {
    calls.push(sql);
    return { rows: sql.includes('INSERT INTO gdelt_seen_events') ? [{ external_id: event.globalEventId }] : [] };
  });
  for (const filter of [
    { ...config, minRelevanceScore: 1 },
    { ...config, minRelevanceScore: 0, targetSectors: ['healthcare'], customKeywords: ['clinical trial'] },
  ]) {
    assert.equal(await insertNewGdeltEvents(client, [event], filter, '2026-11-01T12:00:00Z'), 0);
  }
  assert.ok(!calls.some((sql) => sql.includes('INSERT INTO articles')));
});

function pollDatabase(calls: string[], checkpoint = '2026-11-01T11:30:00Z', locked = true) {
  return database(async (sql, values) => {
    calls.push(sql.includes('INSERT INTO gdelt_stream_state') ? `checkpoint:${values![0]}` : sql);
    if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked }] };
    if (sql.includes('SELECT last_export')) return { rows: [{ last_export: new Date(checkpoint) }] };
    return { rows: [] };
  });
}

const clusteringResult = { totalUnclusteredProcessed: 0, clustersCreated: 0, articlesClustered: 0, clusters: [] };

test('worker passes current environment filters into each ingestion poll', async (t) => {
  const overrides = {
    MIN_RELEVANCE_SCORE: '0.8', TARGET_SECTORS: 'Healthcare, Energy',
    CUSTOM_KEYWORDS: 'Clinical Trial, AI', PRIORITY_COUNTRIES: 'DE, IN',
  };
  const previous = Object.keys(overrides).map((key) => [key, process.env[key]] as const);
  t.after(() => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  Object.assign(process.env, overrides);
  let received: ReturnType<typeof loadRelevanceConfig> | undefined;
  await runGdeltPoll(pollDatabase([]), undefined, {
    latest: async () => latest,
    ingest: async (_url, _client, _signal, filters) => { received = filters; return 0; },
    cluster: async () => clusteringResult, enqueue: async () => {},
  });
  assert.equal(received?.minRelevanceScore, 0.8);
  assert.deepEqual(received?.targetSectors, ['healthcare', 'energy']);
  assert.deepEqual(received?.customKeywords, ['clinical trial', 'ai']);
  assert.deepEqual(received?.priorityCountries, ['de', 'in']);
});

test('poll checkpoints each committed export before clustering and enqueueing', async () => {
  const calls: string[] = [];
  const count = await runGdeltPoll(pollDatabase(calls), undefined, {
    latest: async () => latest,
    ingest: async (url) => { calls.push(`ingest:${url}`); return 2; },
    cluster: async () => { calls.push('cluster'); return clusteringResult; },
    enqueue: async () => { calls.push('enqueue'); },
  });
  assert.equal(count, 4);
  const checkpointIndex = calls.indexOf('checkpoint:2026-11-01T11:45:00.000Z');
  assert.ok(checkpointIndex > calls.indexOf(`ingest:${latest.replace('120000', '114500')}`));
  assert.ok(checkpointIndex < calls.indexOf(`ingest:${latest}`));
  assert.ok(calls.indexOf('cluster') > calls.indexOf('checkpoint:2026-11-01T12:00:00.000Z'));
  assert.ok(calls.indexOf('enqueue') > calls.indexOf('cluster'));
  assert.match(calls.at(-1)!, /pg_advisory_unlock/);
});

test('failed export is not checkpointed and always releases the poll lock', async () => {
  const calls: string[] = [];
  await assert.rejects(runGdeltPoll(pollDatabase(calls), undefined, {
    latest: async () => latest,
    ingest: async () => { throw new Error('download failed'); },
    cluster: async () => { calls.push('cluster'); return clusteringResult; },
    enqueue: async () => { calls.push('enqueue'); },
  }), /download failed/);
  assert.ok(!calls.some((call) => call.startsWith('checkpoint:')));
  assert.ok(!calls.includes('cluster'));
  assert.match(calls.at(-1)!, /pg_advisory_unlock/);
});

test('poll recovers clustering and queueing even when no exports are new', async () => {
  const calls: string[] = [];
  await runGdeltPoll(pollDatabase(calls, '2026-11-01T12:00:00Z'), undefined, {
    latest: async () => latest,
    ingest: async () => { assert.fail('should not reingest'); },
    cluster: async () => { calls.push('cluster'); return clusteringResult; },
    enqueue: async () => { calls.push('enqueue'); },
  });
  assert.ok(calls.includes('cluster'));
  assert.ok(calls.includes('enqueue'));
});

test('another active worker prevents a duplicate ingestion poll', async () => {
  const calls: string[] = [];
  assert.equal(await runGdeltPoll(pollDatabase(calls, undefined, false), undefined, {
    latest: async () => { assert.fail('must not fetch'); },
    ingest: async () => 0, cluster: async () => clusteringResult, enqueue: async () => {},
  }), 0);
  assert.equal(calls.length, 1);
});

test('live snapshots show new cards first without duplicates or initial-load badges', () => {
  const incoming = [{ id: 1 }, { id: 2 }, { id: 2 }] as OpportunityResponseItem[];
  const result = applyOpportunitySnapshot(new Set([1]), incoming, true);
  assert.deepEqual(result.opportunities.map((item) => item.id), [2, 1]);
  assert.deepEqual(result.newIds, [2]);
  assert.deepEqual(applyOpportunitySnapshot(null, incoming, true).newIds, []);
  assert.deepEqual(applyOpportunitySnapshot(new Set([1]), incoming, false).newIds, []);
});

test('heatmap returns uncached regional totals for its rolling 24-hour window', async (t) => {
  t.mock.method(getPool(), 'query', async () => ({ rows: [{ code: 'IN', count: 3 }, { code: 'US', count: 2 }] }));
  const response = await getHeatmap();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), {
    success: true, regions: [{ code: 'IN', count: 3 }, { code: 'US', count: 2 }], window: '24h', total: 5,
  });
});

test('heatmap reports missing database configuration without querying', async (t) => {
  const query = t.mock.method(getPool(), 'query');
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    assert.equal((await getHeatmap()).status, 503);
    assert.equal(query.mock.callCount(), 0);
  } finally {
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
});
