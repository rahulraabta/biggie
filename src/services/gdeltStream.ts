import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import type { Client } from 'pg';
import type { ReadableStream } from 'node:stream/web';
import unzipper from 'unzipper';
import { parseGdeltLine, upsertEventBatch } from '../../scripts/ingest-gdelt.js';
import { loadRelevanceConfig, type RelevanceConfig } from '../config/relevanceConfig.js';
import { evaluateEventRelevance, type GdeltEvent } from './relevanceEngine.js';

export const GDELT_POLL_INTERVAL_MS = 15 * 60 * 1000;
const MAX_EXPORTS_PER_POLL = 96;
type DatabaseClient = Pick<Client, 'query'>;

export function gdeltExportTimestamp(url: string): number {
  const match = new URL(url).pathname.match(/(\d{14})\.export\.CSV\.zip$/i);
  if (!match) throw new Error('Expected a GDELT 15-minute export URL.');
  const stamp = match[1];
  return Date.UTC(+stamp.slice(0, 4), +stamp.slice(4, 6) - 1, +stamp.slice(6, 8), +stamp.slice(8, 10), +stamp.slice(10, 12), +stamp.slice(12, 14));
}

export function pendingGdeltExports(latestUrl: string, checkpoint: Date | string | null): string[] {
  const latest = gdeltExportTimestamp(latestUrl);
  if (!checkpoint) return [latestUrl];
  const start = new Date(checkpoint).getTime() + GDELT_POLL_INTERVAL_MS;
  const urls: string[] = [];
  for (let stamp = start; stamp <= latest && urls.length < MAX_EXPORTS_PER_POLL; stamp += GDELT_POLL_INTERVAL_MS) {
    const filename = new Date(stamp).toISOString().replace(/\D/g, '').slice(0, 14);
    const url = new URL(latestUrl);
    url.pathname = url.pathname.replace(/\d{14}\.export\.CSV\.zip$/i, `${filename}.export.CSV.zip`);
    urls.push(url.toString());
  }
  return urls;
}

export async function latestGdeltExport(signal?: AbortSignal): Promise<string> {
  if (process.env.GDELT_URL) { gdeltExportTimestamp(process.env.GDELT_URL); return process.env.GDELT_URL; }
  const res = await fetch('https://data.gdeltproject.org/gdeltv2/lastupdate.txt', { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`GDELT manifest HTTP ${res.status}`);
  const url = (await res.text()).split(/\s+/).find((value) => /^https?:\/\/.*\d{14}\.export\.CSV\.zip$/i.test(value));
  if (!url) throw new Error('GDELT manifest contains no export.');
  return url.replace(/^http:/, 'https:');
}

export async function insertNewGdeltEvents(client: DatabaseClient, events: GdeltEvent[], config: RelevanceConfig, publishedAt: string): Promise<number> {
  const unique = [...new Map(events.filter((event) => event.globalEventId).map((event) => [event.globalEventId, event])).values()];
  if (!unique.length) return 0;
  await client.query('BEGIN');
  try {
    const claimed = await client.query<{ external_id: string }>(
      'INSERT INTO gdelt_seen_events(external_id) SELECT unnest($1::text[]) ON CONFLICT DO NOTHING RETURNING external_id',
      [unique.map((event) => event.globalEventId)]
    );
    const ids = new Set(claimed.rows.map((row) => row.external_id));
    const relevant = unique.filter((event) => ids.has(event.globalEventId))
      .map((event) => ({ event, evalRes: evaluateEventRelevance(event, config) }))
      .filter((item) => item.evalRes.isRelevant);
    const result = await upsertEventBatch(client, relevant, { newOnly: true, publishedAt });
    await client.query('COMMIT');
    return result.inserted;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

export async function ingestGdeltExport(url: string, client: DatabaseClient, signal?: AbortSignal, config = loadRelevanceConfig()): Promise<number> {
  const publishedAt = new Date(gdeltExportTimestamp(url)).toISOString();
  const res = await fetch(url, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(180_000)]) : AbortSignal.timeout(180_000) });
  if (!res.ok || !res.body) throw new Error(`GDELT export HTTP ${res.status}`);
  const stream = Readable.fromWeb(res.body as ReadableStream<Uint8Array>);
  const archive = unzipper.Parse({ forceStream: true });
  stream.on('error', (error) => archive.destroy(error));
  stream.pipe(archive);
  let inserted = 0;
  let foundCsv = false;
  try {
    for await (const entry of archive) {
      if (entry.type !== 'File' || !entry.path.toLowerCase().endsWith('.csv')) { entry.autodrain(); continue; }
      foundCsv = true;
      const lines = createInterface({ input: entry, crlfDelay: Infinity });
      let batch: GdeltEvent[] = [];
      for await (const line of lines) {
        signal?.throwIfAborted();
        const event = parseGdeltLine(line);
        if (event) batch.push(event);
        if (batch.length >= Math.max(1, config.batchSize)) {
          inserted += await insertNewGdeltEvents(client, batch, config, publishedAt);
          batch = [];
        }
      }
      inserted += await insertNewGdeltEvents(client, batch, config, publishedAt);
    }
    if (!foundCsv) throw new Error('GDELT archive contains no CSV.');
    return inserted;
  } finally {
    stream.destroy();
    archive.destroy();
  }
}
