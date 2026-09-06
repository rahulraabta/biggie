/* One-off: verify hybrid RRF search against the live Neon corpus. */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { searchOpportunities } from '../src/services/embeddingService.js';
import { closePool } from '../src/db/index.js';

/** Voyage free tier is 3 RPM — pause 22s between queries so the four checks
 * stay under the limit (the in-process rate limiter adds no extra wait once
 * this pause has elapsed). */
const PAUSE_MS = 22_000;

function pause(label: string) {
  console.log(`\n(pause ${(PAUSE_MS / 1000).toFixed(0)}s — Voyage 3 RPM free tier — before: ${label})`);
  return new Promise((r) => setTimeout(r, PAUSE_MS));
}

async function run(label: string, q: string, options: Record<string, unknown>) {
  const results = await searchOpportunities(q, options);
  console.log(`\n=== ${label} | q="${q}" | opts=${JSON.stringify(options)} -> ${results.length} results ===`);
  for (const r of results) {
    console.log(
      `  rrf=${Number(r.rrf_score).toFixed(4)}  vec=${Number(r.vector_similarity).toFixed(3)}  fts=${Number(r.text_score).toFixed(3)}  | ${r.title}`
    );
  }
  return results;
}

async function main() {
  // 1. Vector-leg-only rescue: FTS has no "semiconductor" in corpus; hybrid should still surface chip items
  const a = await run('hybrid: semantic gap', 'semiconductor subsidy India', { limit: 3 });
  if (a.length === 0) throw new Error('expected vector leg to rescue the semiconductor query');

  await pause('hybrid: both legs');
  // 2. Both legs agree: "chip manufacturing" hits FTS literally and vector semantically
  const b = await run('hybrid: both legs', 'chip manufacturing', { limit: 3 });
  const topBoth = b[0];
  if (!(topBoth.vector_similarity > 0 && topBoth.text_score > 0)) {
    throw new Error(`expected top result to match both legs, got vec=${topBoth.vector_similarity} fts=${topBoth.text_score}`);
  }

  await pause('threshold filter');
  // 3. minSimilarity floor: a very high threshold must prune vector-leg rows
  const c = await run('threshold filter', 'chip manufacturing', { limit: 10, minSimilarity: 0.95 });
  for (const r of c) {
    if (r.vector_similarity > 0 && r.vector_similarity < 0.95) {
      throw new Error(`row below threshold survived: ${r.title} vec=${r.vector_similarity}`);
    }
  }

  await pause('defaults');
  // 4. Default options (limit 10, minSimilarity 0.22)
  await run('defaults', 'climate resilience', {});

  await closePool();
  console.log('\nHYBRID SEARCH VERIFICATION PASSED');
}

main().catch((e) => {
  console.error('VERIFICATION FAILED:', e.message);
  process.exit(1);
});
