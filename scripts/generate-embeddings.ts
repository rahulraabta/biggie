import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { query, closePool } from '../src/db/index.js';
import { buildEmbeddingInput, embedDocuments, EmbeddingSourceRecord } from '../src/services/embeddingService.js';

/**
 * Voyage AI embedding worker: backfills opportunities.embedding for every
 * record where embedding IS NULL, using voyage-4 (1024 dims).
 *
 * Usage: npx tsx scripts/generate-embeddings.ts [--dry-run]
 */

interface PendingOpportunityRow extends EmbeddingSourceRecord {
  id: number;
  specific_catalysts: string[] | null;
}

async function runEmbeddingWorker(options?: { dryRun?: boolean; limit?: number }): Promise<void> {
  const isDryRun = options?.dryRun ?? false;
  const startTime = Date.now();

  console.log(`\n================ VOYAGE EMBEDDING WORKER ================`);
  console.log(`Execution Mode: ${isDryRun ? 'DRY-RUN (No DB writes, no API calls)' : 'PRODUCTION (Voyage voyage-4 + Neon writes)'}`);
  console.log(`==========================================================\n`);

  // Fetch opportunities lacking embeddings. Sector/region live on the parent
  // story cluster (dominant_sector / primary_region), not on opportunities.
  const res = await query<PendingOpportunityRow>(
    `SELECT
       o.id,
       o.title,
       o.short_description,
       o.core_problem,
       o.specific_catalysts,
       c.dominant_sector AS sector,
       c.primary_region AS country_code
     FROM opportunities o
     LEFT JOIN story_clusters c ON o.cluster_id = c.id
     WHERE o.embedding IS NULL
     ORDER BY o.id
     LIMIT $1;`,
    [options?.limit || 1000]
  );

  const pending = res.rows.map((row) => ({
    ...row,
    catalysts: row.specific_catalysts,
  }));

  if (pending.length === 0) {
    console.log('[Embedding Worker] No opportunities with NULL embedding found. Nothing to do.');
    await closePool();
    return;
  }

  console.log(`[Embedding Worker] Found ${pending.length} opportunities to embed.`);
  const texts = pending.map((row) => buildEmbeddingInput(row));

  if (isDryRun) {
    console.log(`[Embedding Worker] DRY-RUN — sample payload for opportunity id=${pending[0].id}:\n`);
    console.log(texts[0]);
    console.log(`\n[Embedding Worker] Would call Voyage embed for ${texts.length} documents. Exiting without changes.`);
    await closePool();
    return;
  }

  console.log(`[Embedding Worker] Calling Voyage embed (model: voyage-4, input_type: document)...`);
  const vectors = await embedDocuments(texts);
  console.log(`[Embedding Worker] Received ${vectors.length} embeddings of ${vectors[0].length} dimensions.`);

  let updated = 0;
  for (let i = 0; i < pending.length; i++) {
    // JSON.stringify of number[] produces '[0.1,0.2,...]' — pgvector text format
    const vectorLiteral = JSON.stringify(vectors[i]);
    await query(
      `UPDATE opportunities SET embedding = $1::vector, updated_at = CURRENT_TIMESTAMP WHERE id = $2;`,
      [vectorLiteral, pending[i].id]
    );
    updated++;
    if (updated % 50 === 0) {
      console.log(`[Embedding Worker] Progress: ${updated}/${pending.length}`);
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(`\n================ EMBEDDING WORKER SUMMARY =================`);
  console.log(`Opportunities Embedded:  ${updated}/${pending.length}`);
  console.log(`Model:                   voyage-4 (1024 dims)`);
  console.log(`Duration (ms):           ${durationMs}ms`);
  console.log(`===========================================================\n`);

  await closePool();
}

// CLI Execution Entrypoint
const isMainModule =
  (typeof require !== 'undefined' && require.main === module) ||
  (Boolean(process.argv[1]) && process.argv[1].includes('generate-embeddings'));

if (isMainModule) {
  const args = process.argv.slice(2);
  const isDryRunArg = args.includes('--dry-run') || args.includes('-d');

  (async () => {
    try {
      await runEmbeddingWorker({ dryRun: isDryRunArg });
    } catch (err) {
      console.error('[Embedding Worker CLI Fatal Error]', err);
      process.exitCode = 1;
    }
  })();
}

export { runEmbeddingWorker };
