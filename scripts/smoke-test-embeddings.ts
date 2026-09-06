/* One-off smoke test: seed test opportunities -> run Voyage embedding worker
 * -> semantic search -> cleanup. Verifies the full pipeline against live
 * Voyage API and Neon. Leaves no data behind.
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { query, closePool } from '../src/db/index.js';
import { searchOpportunities } from '../src/services/embeddingService.js';
import { runEmbeddingWorker } from './generate-embeddings.js';

const TEST_TITLE_PREFIX = '[SMOKE-TEST]';

async function main() {
  // 1. Seed: one cluster + three distinct-sector opportunities
  const cluster = await query<{ id: number }>(
    `INSERT INTO story_clusters (title, dominant_sector, primary_region, article_count)
     VALUES ('Smoke test cluster', 'technology', 'IN', 1) RETURNING id;`
  );
  const clusterId = cluster.rows[0].id;

  const seedRows: Array<[string, string, string, string[], string]> = [
    [
      'Cold-chain logistics for vaccine distribution in rural India',
      'business',
      'Solar-powered cold storage units cut vaccine spoilage across last-mile clinics',
      ['State health tenders open Q4', 'Solar subsidy extension'],
      'Rural clinics lack refrigeration, causing 30% vaccine wastage before administration.',
    ],
    [
      'Green hydrogen freight corridor across EU ports',
      'investment',
      'Hydrogen refueling infrastructure between Rotterdam and Hamburg reaches bankability',
      ['EU Green Deal funding tranche', 'Port authority MOUs signed'],
      'Trucking decarbonization targets are unmet due to missing refueling backbone.',
    ],
    [
      'AI-powered OSAT assembly automation for semiconductor fabs',
      'innovation',
      'Machine vision inspection reduces defect rates in chip assembly lines',
      ['India semiconductor subsidy scheme', 'Fab capacity expansion'],
      'Manual inspection bottlenecks limit throughput in assembly and test facilities.',
    ],
  ];

  for (const [title, type, short_description, specific_catalysts, core_problem] of seedRows) {
    await query(
      `INSERT INTO opportunities
         (cluster_id, type, title, short_description, core_problem, specific_catalysts,
          feasibility_score, impact_score, time_to_market_score, probability_score, band)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, 70, 80, 60, 65, 'orange');`,
      [clusterId, type, `${TEST_TITLE_PREFIX} ${title}`, short_description, core_problem, JSON.stringify(specific_catalysts)]
    );
  }
  console.log('seeded 1 cluster + 3 opportunities');

  // 2. Run the embedding worker (live Voyage call)
  await runEmbeddingWorker({});

  // 3. Semantic search — vaccine cold chain should rank the India logistics item first
  const results = await searchOpportunities('how to stop vaccines spoiling in remote areas', 3);
  console.log('\n--- semantic search: "how to stop vaccines spoiling in remote areas" ---');
  for (const r of results) {
    console.log(`  sim=${r.similarity} | ${r.title} | sector=${r.dominant_sector} region=${r.primary_region}`);
  }
  if (results.length === 0) throw new Error('search returned no results');

  // 4. Cleanup test data
  await query(`DELETE FROM opportunities WHERE title LIKE $1;`, [`${TEST_TITLE_PREFIX}%`]);
  await query(`DELETE FROM story_clusters WHERE id = $1;`, [clusterId]);
  console.log('\ncleanup done — test rows removed');
  await closePool();
}

main().catch(async (e) => {
  console.error('SMOKE TEST FAILED:', e.message);
  try {
    await query(`DELETE FROM opportunities WHERE title LIKE $1;`, [`${TEST_TITLE_PREFIX}%`]);
    await query(`DELETE FROM story_clusters WHERE title = 'Smoke test cluster';`);
    await closePool();
  } catch {}
  process.exit(1);
});
