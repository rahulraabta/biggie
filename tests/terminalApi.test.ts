import test from 'node:test';
import assert from 'node:assert/strict';
import { getPool } from '../src/db/index';
import { GET as getNews } from '../app/api/news/route';
import { GET as getOpportunities } from '../app/api/opportunities/route';

test('news feed returns recent GDELT events without caching', async (t) => {
  const events = [{ id: 1, title: 'Energy policy update', url: 'https://example.com/news', country_code: 'IN', published_at: new Date().toISOString() }];
  const query = t.mock.method(getPool(), 'query', async () => ({ rows: events }));
  const res = await getNews();
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.deepEqual((await res.json()).events, events);
  const sql = query.mock.calls[0].arguments[0] as string;
  assert.match(sql, /LOWER\(source\) = 'gdelt'/);
  assert.match(sql, /published_at >= NOW\(\) - INTERVAL '24 hours'/);
});

test('news feed has a successful empty state', async (t) => {
  t.mock.method(getPool(), 'query', async () => ({ rows: [] }));
  const res = await getNews();
  assert.deepEqual(await res.json(), { success: true, events: [] });
});

test('news feed reports unavailable without database configuration', async (t) => {
  const query = t.mock.method(getPool(), 'query');
  const databaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    const res = await getNews();
    assert.equal(res.status, 503);
    assert.equal((await res.json()).success, false);
    assert.equal(query.mock.callCount(), 0);
  } finally {
    process.env.DATABASE_URL = databaseUrl;
  }
});

test('news feed hides database error details', async (t) => {
  t.mock.method(getPool(), 'query', async () => { throw new Error('private database details'); });
  t.mock.method(console, 'error', () => {});
  const res = await getNews();
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { success: false, error: 'News feed unavailable.' });
});

test('palette selection loads a complete opportunity by parameterized id', async (t) => {
  const opportunity = { id: 42, title: 'Solar microgrid', primary_region: 'IN', long_description: 'Full dossier', risks: ['Execution'], band: 'green' };
  const query = t.mock.method(getPool(), 'query', async () => ({ rows: [opportunity] }));
  const res = await getOpportunities(new Request('http://localhost/api/opportunities?id=42'));
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.opportunities[0].long_description, 'Full dossier');
  assert.deepEqual(data.opportunities[0].risks, ['Execution']);
  assert.match(query.mock.calls[0].arguments[0] as string, /AND o\.id = \$1/);
  assert.deepEqual(query.mock.calls[0].arguments[1], [42]);
});

test('palette selection rejects invalid ids before querying', async (t) => {
  const query = t.mock.method(getPool(), 'query');
  for (const id of ['', '0', '-1', '1.5', '1 OR 1=1', '9007199254740992']) {
    const res = await getOpportunities(new Request(`http://localhost/api/opportunities?id=${encodeURIComponent(id)}`));
    assert.equal(res.status, 400);
  }
  assert.equal(query.mock.callCount(), 0);
});
