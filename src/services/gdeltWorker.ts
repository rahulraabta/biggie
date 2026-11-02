import { randomUUID } from 'node:crypto';
import type { Client } from 'pg';
import { latestGdeltExport, pendingGdeltExports, ingestGdeltExport, gdeltExportTimestamp } from './gdeltStream.js';
import { runClusteringPipeline } from './clusteringService.js';
import { createTaskEvent } from '../pipeline/eventStore.js';
import { loadRelevanceConfig } from '../config/relevanceConfig.js';

type DatabaseClient = Pick<Client, 'query'>;

export async function recoverOpportunityTasks(client: DatabaseClient, maxRetries: number, staleMs: number): Promise<void> {
  await client.query(`UPDATE pipeline_events
    SET status = 'pending', locked_at = NULL, locked_by = NULL, updated_at = NOW()
    WHERE agent_type = 'opportunity' AND (
      (status = 'failed' AND retry_count < $1)
      OR (status = 'running' AND locked_at < NOW() - ($2::text || ' milliseconds')::interval)
    )`, [maxRetries, String(staleMs)]);
}

export async function enqueueGdeltOpportunities(client: DatabaseClient): Promise<void> {
  const { rows } = await client.query<{ id: number }>(`
    SELECT c.id FROM story_clusters c
    WHERE c.created_at >= NOW() - INTERVAL '24 hours'
      AND c.source_type IN ('GDELT', 'HYBRID')
      AND NOT EXISTS (SELECT 1 FROM opportunities o WHERE o.cluster_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM pipeline_events e WHERE e.agent_type = 'opportunity'
        AND e.payload @> jsonb_build_object('clusterIds', jsonb_build_array(c.id)))
    ORDER BY c.id LIMIT 150
  `);
  for (let index = 0; index < rows.length; index += 15) {
    await createTaskEvent(randomUUID(), 'opportunity', { clusterIds: rows.slice(index, index + 15).map((row) => row.id), limit: 15 });
  }
}

export async function runGdeltPoll(
  client: DatabaseClient,
  signal?: AbortSignal,
  dependencies = { latest: latestGdeltExport, ingest: ingestGdeltExport, cluster: runClusteringPipeline, enqueue: enqueueGdeltOpportunities }
): Promise<number> {
  const lock = await client.query<{ locked: boolean }>('SELECT pg_try_advisory_lock(874510) AS locked');
  if (!lock.rows[0]?.locked) return 0;
  try {
    const config = loadRelevanceConfig();
    const state = await client.query<{ last_export: Date }>('SELECT last_export FROM gdelt_stream_state WHERE singleton = TRUE');
    const latest = await dependencies.latest(signal);
    let inserted = 0;
    for (const url of pendingGdeltExports(latest, state.rows[0]?.last_export || null)) {
      signal?.throwIfAborted();
      inserted += await dependencies.ingest(url, client, signal, config);
      await client.query(`INSERT INTO gdelt_stream_state(singleton, last_export) VALUES (TRUE, $1)
        ON CONFLICT (singleton) DO UPDATE SET last_export = EXCLUDED.last_export`, [new Date(gdeltExportTimestamp(url)).toISOString()]);
    }
    // Clustering and queue recovery also run after an interrupted prior poll.
    await dependencies.cluster({ limit: 10_000 });
    await dependencies.enqueue(client);
    return inserted;
  } finally {
    await client.query('SELECT pg_advisory_unlock(874510)').catch(() => {});
  }
}
