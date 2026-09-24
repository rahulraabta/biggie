"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runOpportunityPipeline = runOpportunityPipeline;
const clusteringService_js_1 = require("../src/services/clusteringService.js");
const opportunityEngine_js_1 = require("../src/services/opportunityEngine.js");
const index_js_1 = require("../src/db/index.js");
function getMockArticlesForDryRun() {
    return [
        {
            id: 1,
            source: 'gdelt',
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
            source: 'gdelt',
            external_id: 'mock-102',
            title: 'Global Tech Giant Partners with Indian Startup on Next-Gen Chip Packaging',
            url: 'https://news.example.com/global-tech-partner-chip-startup',
            published_at: new Date().toISOString(),
            country_code: 'IN',
            actor_1: 'INDIAN STARTUP',
            actor_2: 'GLOBAL TECH CORP',
            event_code: '033',
            goldstein_scale: 7.5,
            num_mentions: 18,
            avg_tone: 4.2,
            relevance_score: 0.78,
            matched_sectors: ['technology', 'startups', 'innovation'],
            cluster_id: null,
        },
        {
            id: 3,
            source: 'gdelt',
            external_id: 'mock-103',
            title: 'EU Approves New Green Hydrogen Logistics Corridor and Subsidy Framework',
            url: 'https://news.example.com/eu-hydrogen-corridor-subsidy',
            published_at: new Date().toISOString(),
            country_code: 'EU',
            actor_1: 'EUROPEAN COMMISSION',
            actor_2: 'ENERGY LOGISTICS GROUP',
            event_code: '081',
            goldstein_scale: 6.8,
            num_mentions: 30,
            avg_tone: 3.8,
            relevance_score: 0.82,
            matched_sectors: ['energy', 'logistics', 'climate', 'regulatory'],
            cluster_id: null,
        },
    ];
}
async function runOpportunityPipeline(options) {
    const startTime = Date.now();
    const isDryRun = options?.dryRun ?? false;
    console.log(`\n================ OPPORTUNITY GENERATION PIPELINE ================`);
    console.log(`Execution Mode:   ${isDryRun ? 'DRY-RUN (Mock data & No DB Writes)' : 'PRODUCTION DB PERSISTENCE'}`);
    console.log(`=================================================================\n`);
    let clusterRes;
    let clustersToProcess = [];
    if (isDryRun) {
        console.log('[Opportunity Pipeline] Running in dry-run mode with synthetic articles...');
        const mockArticles = getMockArticlesForDryRun();
        clusterRes = await (0, clusteringService_js_1.runClusteringPipeline)({ dryRun: true });
        // Manually run clustering on synthetic articles for dry run
        const { clusterArticles } = await import('../src/services/clusteringService.js');
        clustersToProcess = clusterArticles(mockArticles);
        clusterRes = {
            totalUnclusteredProcessed: mockArticles.length,
            clustersCreated: clustersToProcess.length,
            articlesClustered: mockArticles.length,
            clusters: clustersToProcess,
        };
    }
    else {
        clusterRes = await (0, clusteringService_js_1.runClusteringPipeline)({ dryRun: false });
        clustersToProcess = clusterRes.clusters;
    }
    console.log(`[Clustering Summary] Processed ${clusterRes.totalUnclusteredProcessed} articles into ${clusterRes.clustersCreated} story clusters.`);
    const oppResult = await (0, opportunityEngine_js_1.processClusterOpportunities)(clustersToProcess, { dryRun: isDryRun });
    const durationMs = Date.now() - startTime;
    console.log(`\n================ OPPORTUNITY GENERATION METRICS SUMMARY ================`);
    console.log(`Total Clusters Processed:      ${oppResult.totalClustersProcessed}`);
    console.log(`Total Opportunities Generated:  ${oppResult.opportunitiesGenerated}`);
    console.log(`By Viability Band:              Green (High): ${oppResult.opportunitiesByBand.green} | Orange (Medium): ${oppResult.opportunitiesByBand.orange} | Red (Low): ${oppResult.opportunitiesByBand.red}`);
    console.log(`By Type:                        Business: ${oppResult.opportunitiesByType.business} | Innovation: ${oppResult.opportunitiesByType.innovation} | Investment: ${oppResult.opportunitiesByType.investment}`);
    console.log(`Pipeline Duration (ms):         ${durationMs}ms`);
    console.log(`========================================================================\n`);
    if (oppResult.opportunities.length > 0) {
        console.log(`--- Sample Generated Opportunity ---`);
        const sample = oppResult.opportunities[0];
        console.log(`Title:       ${sample.title}`);
        console.log(`Type:        ${sample.type.toUpperCase()}`);
        console.log(`Prob Score:  ${sample.probability_score}% (Band: ${sample.band.toUpperCase()})`);
        console.log(`Scores:      Feasibility=${sample.feasibility_score} | Impact=${sample.impact_score} | Time-To-Market=${sample.time_to_market_score}`);
        console.log(`Summary:     ${sample.short_description}`);
        console.log(`-------------------------------------\n`);
    }
    if (!isDryRun) {
        await (0, index_js_1.closePool)();
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
if (typeof require !== 'undefined' && require.main === module) {
    const args = process.argv.slice(2);
    const isDryRunArg = args.includes('--dry-run') || args.includes('-d');
    (async () => {
        try {
            await runOpportunityPipeline({ dryRun: isDryRunArg });
        }
        catch (err) {
            console.error('[Opportunity Pipeline CLI Fatal Error]', err);
            process.exitCode = 1;
        }
    })();
}
