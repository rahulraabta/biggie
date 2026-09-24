import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as postExportMemo } from '../app/api/export-memo/route.js';

/** Raw request body mirroring `getMemoPayload()` output from store/memo-state.ts. */
function makeBody(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    generatedAt: '2026-09-17T10:00:00.000Z',
    query: {
      text: 'green hydrogen',
      strategy: 'hybrid-rrf',
      status: 'ready',
      resultCount: 12,
      lastRunAt: '2026-09-17T09:59:00.000Z',
    },
    chunks: [
      {
        id: 7,
        title: 'Green Hydrogen Corridor',
        rank: 1,
        rrfScore: 0.032787125,
        vectorSimilarity: 0.8123456789,
        textScore: 0.4213,
        sector: 'energy',
        region: 'IN',
        band: 'green',
        excerpt: 'Tier-2 electrolyzer supply gap.',
      },
    ],
    filters: { band: 'all', sector: 'all', region: 'all', type: 'all', sort: 'highest_probability' },
    ...overrides,
  };
}

function post(body: unknown, url = 'http://localhost:3000/api/export-memo') {
  return postExportMemo(
    new Request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  );
}

test('POST /api/export-memo - rejects a malformed or missing body', async () => {
  const notJson = await post('{not json');
  assert.equal(notJson.status, 400);
  assert.equal((await notJson.json()).success, false);

  for (const missing of [null, [], {}, { version: 1 }]) {
    const res = await post(missing);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(typeof data.error === 'string' && data.error.length > 0);
  }
});

test('POST /api/export-memo - rejects an unsupported payload version', async () => {
  const res = await post(makeBody({ version: 99 }));
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /version/i);
});

test('POST /api/export-memo - rejects structurally invalid chunks', async () => {
  const badBand = await post(
    makeBody({ chunks: [{ ...makeBody().chunks[0], band: 'purple' }] })
  );
  assert.equal(badBand.status, 400);
  assert.match((await badBand.json()).error, /band/);

  const missingTitle = await post(makeBody({ chunks: [{ ...makeBody().chunks[0], title: 42 }] }));
  assert.equal(missingTitle.status, 400);
  assert.match((await missingTitle.json()).error, /title/);
});

test('POST /api/export-memo - returns 422 for an empty memo', async () => {
  const res = await post(
    makeBody({
      query: { text: '   ', strategy: 'hybrid-rrf', status: 'idle', resultCount: 0, lastRunAt: null },
      chunks: [],
    })
  );
  assert.equal(res.status, 422);
  assert.equal((await res.json()).success, false);
});
test('POST /api/export-memo - renders search context, filters and evidence', async () => {
  const res = await post(
    makeBody({
      filters: { band: 'green', sector: 'energy', region: 'IN', type: 'all', sort: 'impact' },
    })
  );
  assert.equal(res.status, 200);
  const data = await res.json();

  assert.equal(data.success, true);
  assert.equal(data.chunkCount, 1);
  assert.equal(data.filename, 'smart-memo-2026-09-17-green-hydrogen.md');
  assert.deepEqual(data.stats, {
    selectedChunkCount: 1,
    distinctSectors: 1,
    distinctRegions: 1,
    hasActiveFilters: true,
  });

  const md = data.markdown as string;
  assert.match(md, /^# Smart Memo — green hydrogen$/m);
  assert.match(md, /^## Search context$/m);
  assert.match(md, /^\| Query \| `green hydrogen` \|$/m);
  assert.match(md, /^\| Results in last run \| 12 \|$/m);
  assert.match(md, /^\| Sector \| energy \|$/m);
  assert.match(md, /^## Selected evidence \(1\)$/m);
  assert.match(md, /^### 1\. Green Hydrogen Corridor$/m);
  assert.match(md, /\*\*Green - viable\*\*/);
  assert.match(md, /RRF `0\.032787`/);
  assert.match(md, /Vector similarity: `0\.812346`/);
  assert.match(md, /- Excerpt: Tier-2 electrolyzer supply gap\./);
});

test('POST /api/export-memo - an idle memo renders without search results', async () => {
  const res = await post(
    makeBody({
      query: { text: 'grid capex', strategy: 'hybrid-rrf', status: 'idle', resultCount: 9, lastRunAt: '2026-09-17T09:00:00.000Z' },
      filters: { band: 'all', sector: 'all', region: 'all', type: 'all', sort: 'highest_probability' },
    })
  );
  const data = await res.json();
  assert.equal(data.stats.hasActiveFilters, false);
  assert.match(data.markdown, /^\| Status \| idle \(no completed run\) \|$/m);
  assert.match(data.markdown, /^\| Results in last run \| 0 \|$/m);
  assert.match(data.markdown, /^\| Last run \| not run \|$/m);
  assert.match(data.markdown, /_No filters applied - the dashboard scope is unrestricted\._/);
});

test('POST /api/export-memo - escapes untrusted titles so they cannot restructure the doc', async () => {
  const res = await post(
    makeBody({
      chunks: [
        {
          ...makeBody().chunks[0],
          title: 'Solar | ## Injected\n\n**bold**',
          excerpt: 'pipes | and\nnewlines',
        },
      ],
    })
  );
  const md = (await res.json()).markdown as string;

  assert.equal(/^## Injected$/m.test(md), false);
  assert.equal(/^### 1\. Solar \\\| \\\#\\\# Injected/m.test(md), true);
  assert.match(md, /Solar \\\| \\#\\# Injected \\\*\\\*bold\\\*\\\*/);
  assert.match(md, /- Excerpt: pipes \\\| and newlines/);
});

test('POST /api/export-memo?format=markdown returns a downloadable document', async () => {
  const res = await post(makeBody(), 'http://localhost:3000/api/export-memo?format=markdown');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /^text\/markdown/);
  assert.equal(
    res.headers.get('content-disposition'),
    'attachment; filename="smart-memo-2026-09-17-green-hydrogen.md"'
  );
  assert.match(await res.text(), /^# Smart Memo/);
});

test('POST /api/export-memo - a memo with chunks but no query text still exports', async () => {
  const res = await post(
    makeBody({
      query: { text: '', strategy: 'hybrid-rrf', status: 'idle', resultCount: 0, lastRunAt: null },
    })
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.filename, 'smart-memo-2026-09-17.md');
  assert.match(data.markdown, /^# Smart Memo — Untitled session$/m);
});