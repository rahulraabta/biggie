import dotenv from 'dotenv';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

export async function runWorker(once = false): Promise<void> {
  const [{ runGdeltPoll, recoverOpportunityTasks }, { GDELT_POLL_INTERVAL_MS }, { OpportunityAgent }, { closePool, getPool }, { env }] = await Promise.all([
    import('../src/services/gdeltWorker.js'), import('../src/services/gdeltStream.js'),
    import('../src/pipeline/agents/opportunityAgent.js'), import('../src/db/index.js'),
    import('../src/config/env.js'),
  ]);
  const databaseUrl = process.env.DATABASE_URL_UNPOOLED;
  if (!databaseUrl || new URL(databaseUrl).hostname.includes('-pooler')) throw new Error('The ingestion worker requires DATABASE_URL_UNPOOLED.');
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  const ingest = async () => {
    do {
      const startedAt = Date.now();
      const client = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 10_000 });
      client.on('error', (error) => console.error('[GDELT Worker] Database connection:', error.message));
      try {
        await client.connect();
        const inserted = await runGdeltPoll(client, controller.signal);
        console.log(`[GDELT Worker] Inserted ${inserted} new articles.`);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('[GDELT Worker] Poll failed:', (error as Error).message);
          if (once) throw error;
        }
      } finally { await client.end().catch(() => {}); }
      if (once || controller.signal.aborted) break;
      await delay(Math.max(1, GDELT_POLL_INTERVAL_MS - (Date.now() - startedAt)), undefined, { signal: controller.signal }).catch(() => {});
    } while (!controller.signal.aborted);
  };
  const synthesize = async () => {
    const agent = new OpportunityAgent();
    while (!controller.signal.aborted) {
      try {
        await recoverOpportunityTasks(getPool(), env.PIPELINE_MAX_RETRIES, Math.max(60 * 60 * 1000, env.PIPELINE_TIMEOUT_MS));
        if (!controller.signal.aborted) await agent.runOnce();
      } catch (error) {
        if (!controller.signal.aborted) console.error('[GDELT Worker] Synthesis retry:', (error as Error).message);
      }
      await delay(5_000, undefined, { signal: controller.signal }).catch(() => {});
    }
  };
  try {
    if (once) await ingest();
    else await Promise.all([ingest(), synthesize()]);
  } finally {
    controller.abort();
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    await closePool();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runWorker(process.argv.includes('--once')).catch((error) => {
    console.error('[GDELT Worker] Fatal:', (error as Error).message);
    process.exitCode = 1;
  });
}
