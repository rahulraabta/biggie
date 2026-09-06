import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { runClusteringPipeline, ArticleRecord, StoryClusterRecord } from '../src/services/clusteringService.js';
import { processClusterOpportunities, OpportunityGenerationResult } from '../src/services/opportunityEngine.js';
import { closePool } from '../src/db/index.js';

function getMockArticlesForDryRun(): ArticleRecord[] {
  return [
    {
      id: 1,
      source: 'gdelt',
      source_type: 'GDELT',
      source_platform: 'GDELT',
      external_id: 'mock-101',
      title: 'India Announces $2B Tariff Subsidy for Semiconductor Manufacturing Units',
      url: 'https://news.example.com/india-semiconductor-subsidy-2026',
      published_at: new Date().toISOString(),
      country_code: 'IN',
      actor_1: 'INDIAN GOVERNMENT',
      actor_2: 'SEMICONDUCTOR FAB CORP',
      event_code: '071',
      goldstein_scale: 8.0,
      num_mentions: 25,
      avg_tone: 5.5,
      relevance_score: 0.85,
      matched_sectors: ['technology', 'manufacturing', 'investment'],
      cluster_id: null,
    },
    {
      id: 2,
      source: 'horizon',
      source_type: 'HORIZON',
      source_platform: 'HackerNews',
      external_id: 'mock-hn-201',
      title: 'Show HN: Open OSAT Semiconductor Assembly Automation Tool',
      url: 'https://news.ycombinator.com/item?id=mock-hn-201',
      published_at: new Date().toISOString(),
      country_code: 'IN',
      actor_1: 'INDIAN STARTUP',
      actor_2: 'GLOBAL TECH CORP',
      event_code: '033',
      goldstein_scale: 7.5,
      num_mentions: 18,
      avg_tone: 4.2,
      relevance_score: 0.88,
      matched_sectors: ['technology', 'startups', 'innovation'],
      community_comments: [
        { user: 'fab_engineer', text: 'Subsidies coupled with OSAT automation make India fab setup 3x faster.' }
      ],
      cluster_id: null,
    },
    {
      id: 3,
      source: 'horizon',
      source_type: 'HORIZON',
      source_platform: 'OpenBB',
      external_id: 'mock-openbb-301',
      title: 'OpenBB Terminal Signal: Hydrogen Logistics Freight Index Surges',
      url: 'https://openbb.co/signal/hydrogen-freight-2026',
      published_at: new Date().toISOString(),
      country_code: 'EU',
      actor_1: 'EUROPEAN COMMISSION',
      actor_2: 'ENERGY LOGISTICS GROUP',
      event_code: '081',
      goldstein_scale: 6.8,
      num_mentions: 30,
      avg_tone: 3.8,
      relevance_score: 0.84,
      matched_sectors: ['energy', 'logistics', 'climate', 'regulatory'],
      community_comments: [
        { user: 'quant_fund', text: 'CapEx allocation to EU green hydrogen corridors accelerating ahead of Q4.' }
      ],
      cluster_id: null,
    },
  ];
}

export async function runOpportunityPipeline(options?: { dryRun?: boolean; limit?: number }): Promise<{
  clustering: { totalUnclusteredProcessed: number; clustersCreated: number; articlesClustered: number };
  opportunities: OpportunityGenerationResult;
}> {
  const startTime = Date.now();
  const isDryRun = options?.dryRun ?? false;
  const maxClustersToProcess = options?.limit || 15;

  console.log(`\n================ OPPORTUNITY GENERATION PIPELINE ================`);
  console.log(`Execution Mode:   ${isDryRun ? 'DRY-RUN (Mock data & No DB Writes)' : 'PRODUCTION COHERE AI PERSISTENCE'}`);
  console.log(`=================================================================\n`);

  let clusterRes;
  let clustersToProcess: StoryClusterRecord[] = [];

  if (isDryRun) {
    console.log('[Opportunity Pipeline] Running in dry-run mode with synthetic articles...');
    const mockArticles = getMockArticlesForDryRun();
    clusterRes = await runClusteringPipeline({ dryRun: true });
    const { clusterArticles } = await import('../src/services/clusteringService.js');
    clustersToProcess = clusterArticles(mockArticles);
    clusterRes = {
      totalUnclusteredProcessed: mockArticles.length,
      clustersCreated: clustersToProcess.length,
      articlesClustered: mockArticles.length,
      clusters: clustersToProcess,
    };
  } else {
    // 1. First run clustering pipeline for any unclustered raw articles
    clusterRes = await runClusteringPipeline({ dryRun: false });

    // 2. Fetch story clusters for Cohere synthesis, prioritizing the four
    // core markets (IN/US/CN/JP) so their clusters are never crowded out of
    // the LIMIT by sheer volume of US-centric news noise.
    const pool = (await import('../src/db/index.js')).getPool();
    const clustersDb = await pool.query<StoryClusterRecord>(
      `SELECT * FROM story_clusters
       ORDER BY (CASE WHEN primary_region IN ('IN','US','CN','JP') THEN 0 ELSE 1 END), article_count DESC
       LIMIT $1;`,
      [maxClustersToProcess]
    );

    const fetchedClusters: StoryClusterRecord[] = [];
    for (const cRow of clustersDb.rows) {
      const articlesDb = await pool.query<ArticleRecord>(
        `SELECT * FROM articles WHERE cluster_id = $1 ORDER BY relevance_score DESC;`,
        [cRow.id]
      );
      fetchedClusters.push({
        ...cRow,
        articles: articlesDb.rows,
      });
    }

    clustersToProcess = fetchedClusters;

    // 3. Clear existing mock data in opportunities table to ensure clean overwrite
    console.log(`[Opportunity Pipeline] Clearing legacy mock opportunities from database...`);
    await pool.query('DELETE FROM opportunities;');
    console.log(`[Opportunity Pipeline] Cleared opportunities table.`);
  }

  console.log(`[Clustering Summary] Processed ${clusterRes.totalUnclusteredProcessed} raw articles. Total clusters ready for Cohere synthesis: ${clustersToProcess.length}.`);

  const oppResult = await processClusterOpportunities(clustersToProcess, { dryRun: isDryRun });

  const durationMs = Date.now() - startTime;

  console.log(`\n================ OPPORTUNITY GENERATION METRICS SUMMARY ================`);
  console.log(`Total Clusters Processed:      ${oppResult.totalClustersProcessed}`);
  console.log(`Total Opportunities Generated:  ${oppResult.opportunitiesGenerated}`);
  console.log(`Opportunities Embedded:         ${oppResult.opportunitiesEmbedded} (voyage-4, at ingest time)`);
  console.log(`By Viability Band:              Green (High): ${oppResult.opportunitiesByBand.green} | Orange (Medium): ${oppResult.opportunitiesByBand.orange} | Red (Low): ${oppResult.opportunitiesByBand.red}`);
  console.log(`By Type:                        Business: ${oppResult.opportunitiesByType.business} | Innovation: ${oppResult.opportunitiesByType.innovation} | Investment: ${oppResult.opportunitiesByType.investment}`);
  console.log(`Pipeline Duration (ms):         ${durationMs}ms`);
  console.log(`========================================================================\n`);

  if (oppResult.opportunities.length > 0) {
    console.log(`--- Sample Cohere Generated Opportunity ---`);
    const sample = oppResult.opportunities[0];
    console.log(`Title:       ${sample.title}`);
    console.log(`Type:        ${sample.type.toUpperCase()}`);
    console.log(`Prob Score:  ${sample.probability_score}% (Band: ${sample.band.toUpperCase()})`);
    console.log(`Scores:      Feasibility=${sample.feasibility_score} | Impact=${sample.impact_score} | Time-To-Market=${sample.time_to_market_score}`);
    console.log(`Summary:     ${sample.short_description}`);
    console.log(`-------------------------------------\n`);
  }

  if (!isDryRun) {
    await closePool();
  }

  return {
    clustering: {
      totalUnclusteredProcessed: clusterRes.totalUnclusteredProcessed,
      clustersCreated: clusterRes.clustersCreated,
      articlesClustered: clusterRes.articlesClustered,
    },
    opportunities: oppResult,
  };
}

// CLI Execution Entrypoint
const isMainModule =
  (typeof require !== 'undefined' && require.main === module) ||
  (Boolean(process.argv[1]) && process.argv[1].includes('generate-opportunities'));

if (isMainModule) {
  const args = process.argv.slice(2);
  const isDryRunArg = args.includes('--dry-run') || args.includes('-d');

  (async () => {
    try {
      await runOpportunityPipeline({ dryRun: isDryRunArg });
    } catch (err) {
      console.error('[Opportunity Pipeline CLI Fatal Error]', err);
      process.exitCode = 1;
    }
  })();
}
