export const dynamic = 'force-dynamic';

import { getPool } from '@/src/db/index';
import { OPPORTUNITY_SELECT_SQL, enrichOpportunity } from '@/src/services/opportunityFeed';
import type { OpportunityResponseItem } from '../route';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) return Response.json({ error: 'Database unavailable.' }, { status: 503 });
  const cursor = request.headers.get('last-event-id');
  if (cursor !== null && (!/^\d+$/.test(cursor) || !Number.isSafeInteger(Number(cursor)))) {
    return Response.json({ error: 'Invalid event cursor.' }, { status: 400 });
  }
  let lastId: number;
  try {
    lastId = cursor !== null ? Number(cursor) : (await getPool().query<{ id: number }>(
      'SELECT COALESCE(MAX(id), 0)::int AS id FROM opportunities'
    )).rows[0].id;
  } catch {
    return Response.json({ error: 'Database unavailable.' }, { status: 503 });
  }

  const encoder = new TextEncoder();
  let dispose = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let polling = false;
      let pollTimer: ReturnType<typeof setInterval>;
      let pingTimer: ReturnType<typeof setInterval>;
      const stop = (close = true) => {
        if (closed) return;
        closed = true;
        clearInterval(pollTimer);
        clearInterval(pingTimer);
        request.signal.removeEventListener('abort', abort);
        if (close) controller.close();
      };
      const abort = () => stop();
      dispose = () => stop(false);
      request.signal.addEventListener('abort', abort, { once: true });
      if (request.signal.aborted) { stop(); return; }
      controller.enqueue(encoder.encode(`id: ${lastId}\nevent: ready\ndata: {}\n\n`));
      const poll = async () => {
        if (closed || polling || (controller.desiredSize ?? 0) <= 0) return;
        polling = true;
        try {
          const { rows } = await getPool().query<OpportunityResponseItem>(
            `${OPPORTUNITY_SELECT_SQL} AND o.id > $1 ORDER BY o.id ASC LIMIT 100`, [lastId]
          );
          if (closed || !rows.length) return;
          const nextId = rows[rows.length - 1].id;
          controller.enqueue(encoder.encode(`id: ${nextId}\ndata: ${JSON.stringify(rows.map(enrichOpportunity))}\n\n`));
          lastId = nextId;
        } catch {
          if (!closed) {
            stop(false);
            controller.error(new Error('Opportunity stream unavailable.'));
          }
        } finally { polling = false; }
      };
      pollTimer = setInterval(() => { void poll(); }, 5_000);
      pingTimer = setInterval(() => {
        if (!closed && (controller.desiredSize ?? 0) > 0) controller.enqueue(encoder.encode(':\n\n'));
      }, 15_000);
    },
    cancel() { dispose(); },
  });
  return new Response(stream, { headers: {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  } });
}
