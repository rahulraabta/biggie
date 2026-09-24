import { BaseAgent } from './baseAgent.js';
import { AgentType, PipelineEvent, OpportunityTaskPayload, OpportunityResultPayload } from '../types.js';
import { processClusterOpportunities } from '@/src/services/opportunityEngine';
import { StoryClusterRecord } from '@/src/services/clusteringService';
import { getPool } from '@/src/db/index';

export class OpportunityAgent extends BaseAgent {
  readonly agentType: AgentType = 'opportunity';

  protected async executeTask(event: PipelineEvent): Promise<Record<string, unknown>> {
    const payload = event.payload as OpportunityTaskPayload;
    const pool = getPool();

    // Fetch clusters ready for synthesis: newest clusters first, capped by limit.
    const limit = payload.limit || 15;
    const clustersDb = await pool.query<StoryClusterRecord>(
      `SELECT * FROM story_clusters
       ORDER BY (CASE WHEN primary_region IN ('IN','US','CN','JP') THEN 0 ELSE 1 END),
                article_count DESC,
                id DESC
       LIMIT $1;`,
      [limit]
    );

    const clusters: StoryClusterRecord[] = [];
    for (const cRow of clustersDb.rows) {
      const articlesDb = await pool.query(
        `SELECT * FROM articles WHERE cluster_id = $1 ORDER BY relevance_score DESC;`,
        [cRow.id]
      );
      clusters.push({ ...cRow, articles: articlesDb.rows as any });
    }

    const result = await processClusterOpportunities(clusters, {
      dryRun: payload.dryRun,
    });

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
