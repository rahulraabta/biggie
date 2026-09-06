/* One-off E2E: verify auto-embed on ingestion via the real
 * processClusterOpportunities path (one real Cohere LLM call + Voyage embed).
 * Seeds a synthetic cluster, runs the engine, asserts embeddings landed
 * immediately, then removes all test data.
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { getPool, closePool } from '../src/db/index.js';
import { processClusterOpportunities } from '../src/services/opportunityEngine.js';
import { StoryClusterRecord, ArticleRecord } from '../src/services/clusteringService.js';

const TEST_CLUSTER_TITLE = '[AUTO-EMBED-E2E] Test Cluster';

function buildTestArticle(i: number): ArticleRecord {
  return {
    id: -i,
    source: 'gdelt',
    source_type: 'GDELT',
    source_platform: 'GDELT',
    external_id: `e2e-${i}`,
    title: 'India expands production-linked incentive scheme for advanced chemistry cell manufacturing',
    url: `https://news.example.com/e2e-autoembed-${i}`,
    published_at: new Date().toISOString(),
    country_code: 'IN',
    actor_1: 'INDIAN GOVERNMENT',
    actor_2: 'CELL MANUFACTURERS',
    event_code: '071',
    goldstein_scale: 8.0,
    num_mentions: 20,
    avg_tone: 4.5,
    relevance_score: 0.85,
    matched_sectors: ['energy', 'manufacturing', 'climate'],
    cluster_id: null,
  };
}

async function main() {
  const pool = getPool();

  // 1. Seed a synthetic cluster so the engine has a real cluster_id to attach to
  const clusterRes = await pool.query<{ id: number }>(
    `INSERT INTO story_clusters (title, topic_label, dominant_sector, primary_region, article_count)
     VALUES ($1, 'battery manufacturing', 'energy', 'IN', 2) RETURNING id;`,
    [TEST_CLUSTER_TITLE]
  );
  const clusterId = clusterRes.rows[0].id;
  console.log(`seeded test cluster id=${clusterId}`);

  const testCluster: StoryClusterRecord = {
    id: clusterId,
    title: 'India battery cell manufacturing incentive expansion',
    topic_label: 'battery manufacturing',
    dominant_sector: 'energy',
    primary_region: 'IN',
    article_count: 2,
    source_type: 'GDELT',
    articles: [buildTestArticle(1), buildTestArticle(2)],
  };

  try {
    // Voyage free tier is 3 RPM. Stagger the script's phases by 22s each:
    // the embed phase (engine run) is the only phase that calls Voyage, so
    // the first pause spaces it away from any embed call made by a preceding
    // process (throttle state is per-process and resets each run).
    console.log('(pause 22s — Voyage 3 RPM free tier — before embed phase)');
    await new Promise((r) => setTimeout(r, 22_000));

    // 2. Run the real engine path (non-dry-run): Cohere generation + INSERT + auto-embed
    const result = await processClusterOpportunities([testCluster], {});
    console.log(`\nengine result: generated=${result.opportunitiesGenerated} embedded=${result.opportunitiesEmbedded}`);
    if (result.opportunitiesGenerated === 0) throw new Error('LLM generated no opportunities — cannot verify');

    // The assertion query below is DB-only (no Voyage call), but hold the
    // same 22s cadence between the embed and query phases so back-to-back
    // runs of this script stay within the 3 RPM budget.
    console.log('(pause 22s — before query phase)');
    await new Promise((r) => setTimeout(r, 22_000));

    // 3. Assert every generated row carries a vector immediately
    const rows = await pool.query<{ id: number; title: string; has_embedding: boolean }>(
      `SELECT id, title, (embedding IS NOT NULL) AS has_embedding
       FROM opportunities WHERE cluster_id = $1;`,
      [clusterId]
    );
    console.log(`\nopportunities for test cluster: ${rows.rows.length}`);
    let allEmbedded = true;
    for (const r of rows.rows) {
      console.log(`  embedded=${r.has_embedding} | ${r.title}`);
      if (!r.has_embedding) allEmbedded = false;
    }
    if (rows.rows.length === 0) throw new Error('no opportunities inserted for test cluster');
    if (!allEmbedded) throw new Error('auto-embed did not cover all inserted rows');
    if (result.opportunitiesEmbedded !== rows.rows.length) {
      throw new Error(`embedded count mismatch: result=${result.opportunitiesEmbedded} db=${rows.rows.length}`);
    }
    console.log('\nAUTO-EMBED E2E PASSED');
  } finally {
    // 4. Cleanup regardless of outcome
    await pool.query(`DELETE FROM opportunities WHERE cluster_id = $1;`, [clusterId]);
    await pool.query(`DELETE FROM story_clusters WHERE id = $1;`, [clusterId]);
    console.log('cleanup done — test data removed');
    await closePool();
  }
}

main().catch((e) => {
  console.error('E2E FAILED:', e.message);
  process.exit(1);
});
