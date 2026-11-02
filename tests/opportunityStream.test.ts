import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { getPool } from '../src/db/index';
import { GET } from '../app/api/opportunities/stream/route';

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
const text = async (reader: ReadableStreamDefaultReader<Uint8Array>) => new TextDecoder().decode((await reader.read()).value);

function timers(t: TestContext) {
  t.mock.timers.enable({ apis: ['setInterval'] });
  return async (ms: number) => { t.mock.timers.tick(ms); await flush(); };
}

test('SSE sends only new IDs every five seconds and stops polling after cancellation', async (t) => {
  const tick = timers(t);
  let polls = 0;
  const query = t.mock.method(getPool(), 'query', async (sql: string) => {
    if (sql.includes('MAX(id)')) return { rows: [{ id: 20 }] };
    return { rows: ++polls === 1 ? [{ id: 21, title: 'Solar pilot', primary_region: 'IN' }] : [] };
  });
  const response = await GET(new Request('http://localhost/api/opportunities/stream'));
  assert.equal(response.headers.get('content-type'), 'text/event-stream; charset=utf-8');
  assert.match(response.headers.get('cache-control')!, /no-cache/);
  assert.equal(response.headers.get('x-accel-buffering'), 'no');
  const reader = response.body!.getReader();
  t.after(() => reader.cancel());
  assert.match(await text(reader), /id: 20\nevent: ready/);
  await tick(4_999);
  assert.equal(query.mock.callCount(), 1);
  await tick(1);
  const frame = await text(reader);
  assert.match(frame, /^id: 21\ndata: /);
  const records = JSON.parse(frame.split('\ndata: ')[1]);
  assert.equal(records[0].id, 21);
  assert.equal(typeof records[0].latitude, 'number');
  assert.match(query.mock.calls[1].arguments[0] as string, /o\.id > \$1 ORDER BY o\.id ASC LIMIT 100/);
  assert.deepEqual(query.mock.calls[1].arguments[1], [20]);
  await tick(5_000);
  assert.deepEqual(query.mock.calls[2].arguments[1], [21]);
  await reader.cancel();
  await tick(15_000);
  assert.equal(query.mock.callCount(), 3);
});

test('SSE reconnect resumes from Last-Event-ID without reloading the baseline', async (t) => {
  const tick = timers(t);
  const query = t.mock.method(getPool(), 'query', async () => ({ rows: [{ id: 43, title: 'Grid investment' }] }));
  const response = await GET(new Request('http://localhost/api/opportunities/stream', { headers: { 'Last-Event-ID': '42' } }));
  const reader = response.body!.getReader();
  t.after(() => reader.cancel());
  assert.match(await text(reader), /^id: 42\n/);
  assert.equal(query.mock.callCount(), 0);
  await tick(5_000);
  assert.match(await text(reader), /^id: 43\n/);
  assert.deepEqual(query.mock.calls[0].arguments[1], [42]);
});

test('SSE sends the exact keep-alive comment every fifteen seconds', async (t) => {
  const tick = timers(t);
  const query = t.mock.method(getPool(), 'query', async (sql: string) => ({ rows: sql.includes('MAX(id)') ? [{ id: 0 }] : [] }));
  const response = await GET(new Request('http://localhost/api/opportunities/stream'));
  const reader = response.body!.getReader();
  t.after(() => reader.cancel());
  await text(reader);
  await tick(5_000);
  await tick(5_000);
  await tick(5_000);
  assert.equal(await text(reader), ':\n\n');
  assert.equal(query.mock.callCount(), 4);
});

test('SSE does not overlap slow queries and ignores results after request abort', async (t) => {
  const tick = timers(t);
  let finish!: (value: { rows: unknown[] }) => void;
  const query = t.mock.method(getPool(), 'query', async (sql: string) => sql.includes('MAX(id)')
    ? { rows: [{ id: 0 }] } : await new Promise<{ rows: unknown[] }>((resolve) => { finish = resolve; }));
  const abort = new AbortController();
  const response = await GET(new Request('http://localhost/api/opportunities/stream', { signal: abort.signal }));
  const reader = response.body!.getReader();
  t.after(() => { abort.abort(); return reader.cancel(); });
  await text(reader);
  await tick(5_000);
  await tick(5_000);
  assert.equal(query.mock.callCount(), 2);
  abort.abort();
  finish({ rows: [{ id: 1, title: 'Late result' }] });
  await flush();
  assert.equal((await reader.read()).done, true);
  await tick(15_000);
  assert.equal(query.mock.callCount(), 2);
});

test('SSE poll errors terminate the stream for EventSource to reconnect', async (t) => {
  const tick = timers(t);
  const query = t.mock.method(getPool(), 'query', async (sql: string) => {
    if (sql.includes('MAX(id)')) return { rows: [{ id: 0 }] };
    throw new Error('private database details');
  });
  const response = await GET(new Request('http://localhost/api/opportunities/stream'));
  const reader = response.body!.getReader();
  await text(reader);
  const failed = assert.rejects(reader.read(), /Opportunity stream unavailable/);
  await tick(5_000);
  await failed;
  await tick(15_000);
  assert.equal(query.mock.callCount(), 2);
});

test('SSE rejects invalid reconnect cursors before querying', async (t) => {
  const query = t.mock.method(getPool(), 'query');
  for (const cursor of ['', '-1', '1.5', '1 OR 1=1', '9007199254740992']) {
    const response = await GET(new Request('http://localhost/api/opportunities/stream', { headers: { 'Last-Event-ID': cursor } }));
    assert.equal(response.status, 400);
  }
  assert.equal(query.mock.callCount(), 0);
});

test('SSE returns a sanitized unavailable response when initial connection fails', async (t) => {
  t.mock.method(getPool(), 'query', async () => { throw new Error('private database details'); });
  const response = await GET(new Request('http://localhost/api/opportunities/stream'));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'Database unavailable.' });
});
