import { BaseAgent } from './baseAgent.js';
import { AgentType, PipelineEvent, OpportunityTaskPayload, OpportunityResultPayload } from '../types.js';
import { processClusterOpportunities } from '@/src/services/opportunityEngine';
import type { OpportunityGenerationResult } from '@/src/services/opportunityEngine';
import { StoryClusterRecord } from '@/src/services/clusteringService';
import { getPool } from '@/src/db/index';
import { callLlmWithCache } from '@/src/services/llmWithCache';
import { OPPORTUNITY_WORKFLOW_VERSION } from '@/src/services/opportunityReasoning';

export class OpportunityAgent extends BaseAgent {
  readonly agentType: AgentType = 'opportunity';

  protected async executeTask(event: PipelineEvent): Promise<Record<string, unknown>> {
    const payload = event.payload as OpportunityTaskPayload;
    const pool = getPool();

    // Fetch clusters ready for synthesis: newest clusters first, capped by limit.
    const limit = payload.limit || 15;
    const clustersDb = await pool.query<StoryClusterRecord>(
      `SELECT * FROM story_clusters
       ${payload.clusterIds ? 'WHERE id = ANY($2::int[])' : ''}
       ORDER BY (CASE WHEN primary_region IN ('IN','US','CN','JP') THEN 0 ELSE 1 END),
                article_count DESC,
                id DESC
       LIMIT $1;`,
      payload.clusterIds ? [limit, payload.clusterIds] : [limit]
    );

    const clusters: StoryClusterRecord[] = [];
    for (const cRow of clustersDb.rows) {
      const articlesDb = await pool.query(
        `SELECT * FROM articles WHERE cluster_id = $1 ORDER BY relevance_score DESC;`,
        [cRow.id]
      );
      clusters.push({ ...cRow, articles: articlesDb.rows as any });
    }

    // The engine calls the LLM per cluster; the whole synthesis is cached under
    // an idempotency hash of the cluster payload so identical input replays
    // instead of paying for the same completions twice. `dryRun` is part of the
    // key so a dry-run entry can never satisfy a real (persisting) run.
    const { response: result, cached } = await callLlmWithCache<OpportunityGenerationResult>({
      agentType: 'opportunity',
      eventId: event.id,
      payload: { workflowVersion: OPPORTUNITY_WORKFLOW_VERSION, dryRun: payload.dryRun ?? false, clusters },
      call: async () => ({
        response: await processClusterOpportunities(clusters, { dryRun: payload.dryRun }),
      }),
    });
    if (cached) {
      console.log('[OpportunityAgent] llm_cache hit - replaying prior synthesis for identical clusters.');
    }

    const opportunityResult: OpportunityResultPayload = {
      totalClustersProcessed: result.totalClustersProcessed,
      opportunitiesGenerated: result.opportunitiesGenerated,
      opportunitiesEmbedded: result.opportunitiesEmbedded,
      opportunitiesByBand: result.opportunitiesByBand,
      opportunitiesByType: result.opportunitiesByType,
    };
    return { ...opportunityResult };
  }
}
