import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MEMO_FILTERS,
  MEMO_PAYLOAD_VERSION,
  buildMemoPayload,
  useMemoStore,
  type MemoVectorChunk,
} from '../store/memo-state.js';

/** Minimal selected-chunk fixture; overrides let each test vary one field. */
function makeChunk(overrides: Partial<MemoVectorChunk> = {}): MemoVectorChunk {
  return {
    id: 1,
    title: 'Green Hydrogen Corridor',
    rank: 1,
    rrfScore: 0.0327871249999,
    vectorSimilarity: 0.8123456789,
    textScore: 0.4213,
    sector: 'energy',
    region: 'IN',
    band: 'green',
    excerpt: 'Tier-2 electrolyzer supply gap.',
    embedding: new Array(1024).fill(0.01),
    ...overrides,
  };
}

test('buildMemoPayload - strips embeddings and rounds fusion scores', () => {
  const payload = buildMemoPayload({
    query: {
      text: 'green hydrogen',
      status: 'ready',
      resultCount: 3,
      lastRunAt: Date.UTC(2026, 8, 17),
    },
    chunks: [makeChunk()],
    filters: { ...DEFAULT_MEMO_FILTERS },
  });

  assert.equal(payload.version, MEMO_PAYLOAD_VERSION);
  assert.equal(payload.query.strategy, 'hybrid-rrf');
  assert.equal(payload.query.lastRunAt, new Date(Date.UTC(2026, 8, 17)).toISOString());
  assert.equal(payload.chunks[0].rrfScore, 0.032787);
  assert.equal(payload.chunks[0].vectorSimilarity, 0.812346);
  assert.equal('embedding' in payload.chunks[0], false);
});

test('buildMemoPayload - produces a JSON-safe payload that round-trips', () => {
  const payload = buildMemoPayload({
    query: { text: 'grid capex', status: 'ready', resultCount: 1, lastRunAt: Date.UTC(2026, 8, 17) },
    chunks: [makeChunk()],
    filters: { ...DEFAULT_MEMO_FILTERS },
  });

  assert.deepEqual(JSON.parse(JSON.stringify(payload)), payload);
});

test('buildMemoPayload - summarizes selection and filter scope', () => {
  const payload = buildMemoPayload({
    query: { text: '  grid capex  ', status: 'ready', resultCount: 5, lastRunAt: Date.UTC(2026, 8, 17) },
    chunks: [
      makeChunk({ id: 1, sector: 'energy', region: 'IN' }),
      makeChunk({ id: 2, sector: 'energy', region: null }),
    ],
    filters: { ...DEFAULT_MEMO_FILTERS, band: 'green', region: 'IN' },
  });

  assert.equal(payload.query.text, 'grid capex');
  assert.equal(payload.stats.selectedChunkCount, 2);
  assert.equal(payload.stats.distinctSectors, 1);
  assert.equal(payload.stats.distinctRegions, 1);
  assert.equal(payload.stats.hasActiveFilters, true);
});

test('buildMemoPayload - never reports a result count for an unfinished run', () => {
  const payload = buildMemoPayload({
    query: { text: 'battery recycling', status: 'loading', resultCount: 12, lastRunAt: Date.UTC(2026, 8, 17) },
    chunks: [],
    filters: { ...DEFAULT_MEMO_FILTERS },
  });

  assert.equal(payload.query.resultCount, 0);
  assert.equal(payload.query.lastRunAt, null);
  assert.equal(payload.stats.hasActiveFilters, false);
  assert.equal(payload.stats.selectedChunkCount, 0);
});

test('useMemoStore - selection dedupes by chunk id and keeps selection order', () => {
  useMemoStore.getState().resetMemo();

  useMemoStore.getState().selectChunk(makeChunk({ id: 7 }));
  useMemoStore.getState().selectChunk(makeChunk({ id: 3 }));
  useMemoStore.getState().selectChunk(makeChunk({ id: 7, title: 'Duplicate' }));

  assert.deepEqual(useMemoStore.getState().chunks.map((c) => c.id), [7, 3]);
  assert.equal(useMemoStore.getState().isChunkSelected(7), true);

  useMemoStore.getState().toggleChunk(makeChunk({ id: 7 }));
  assert.deepEqual(useMemoStore.getState().chunks.map((c) => c.id), [3]);
  assert.equal(useMemoStore.getState().isChunkSelected(7), false);

  useMemoStore.getState().deselectChunk(3);
  assert.equal(useMemoStore.getState().chunks.length, 0);
});

test('useMemoStore - a different query clears selections from the previous result set', () => {
  useMemoStore.getState().resetMemo();

  useMemoStore.getState().beginSearch('solar');
  assert.equal(useMemoStore.getState().query.status, 'loading');
  useMemoStore.getState().completeSearch('solar', 4);
  useMemoStore.getState().selectChunk(makeChunk({ id: 11 }));

  // Re-running the same query keeps the analyst's selections...
  useMemoStore.getState().completeSearch('solar', 4);
  assert.equal(useMemoStore.getState().chunks.length, 1);

  // ...but a new query invalidates them.
  useMemoStore.getState().completeSearch('wind', 2);
  assert.equal(useMemoStore.getState().chunks.length, 0);
  assert.equal(useMemoStore.getState().query.resultCount, 2);

  useMemoStore.getState().failSearch('wind');
  assert.equal(useMemoStore.getState().query.status, 'error');
  assert.equal(useMemoStore.getState().getMemoPayload().query.resultCount, 0);
});

test('useMemoStore - filter updates and reset drive payload scope', () => {
  useMemoStore.getState().resetMemo();
  assert.equal(useMemoStore.getState().getMemoPayload().stats.hasActiveFilters, false);

  useMemoStore.getState().setFilter('sector', 'logistics');
  useMemoStore.getState().patchFilters({ region: 'IN', sort: 'impact' });

  const filters = useMemoStore.getState().filters;
  assert.equal(filters.sector, 'logistics');
  assert.equal(filters.region, 'IN');
  assert.equal(filters.sort, 'impact');
  assert.equal(filters.band, 'all');
  assert.equal(useMemoStore.getState().getMemoPayload().stats.hasActiveFilters, true);

  useMemoStore.getState().resetFilters();
  assert.deepEqual(useMemoStore.getState().filters, { ...DEFAULT_MEMO_FILTERS });
  assert.equal(useMemoStore.getState().getMemoPayload().stats.hasActiveFilters, false);
});

test('useMemoStore.getMemoJson - serializes the memo state as JSON text', () => {
  useMemoStore.getState().resetMemo();
  useMemoStore.getState().completeSearch('green hydrogen', 6);
  useMemoStore.getState().selectChunk(makeChunk({ id: 21 }));

  const json = useMemoStore.getState().getMemoJson(2);
  const parsed = JSON.parse(json);

  assert.equal(parsed.version, MEMO_PAYLOAD_VERSION);
  assert.equal(parsed.query.text, 'green hydrogen');
  assert.equal(parsed.query.resultCount, 6);
  assert.equal(parsed.chunks.length, 1);
  assert.equal(parsed.chunks[0].id, 21);
  assert.equal(typeof parsed.generatedAt, 'string');
  assert.ok(json.includes('\n'));
});