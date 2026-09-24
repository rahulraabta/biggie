import { BaseAgent } from './baseAgent.js';
import { AgentType, PipelineEvent, ClusteringTaskPayload, ClusteringResultPayload } from '../types.js';
import { runClusteringPipeline } from '@/src/services/clusteringService';

export class ClusteringAgent extends BaseAgent {
  readonly agentType: AgentType = 'clustering';

  protected async executeTask(event: PipelineEvent): Promise<Record<string, unknown>> {
    const payload = event.payload as ClusteringTaskPayload;
    const result = await runClusteringPipeline({
      dryRun: payload.dryRun,
      limit: payload.limit,
    });
    const clusteringResult: ClusteringResultPayload = {
      totalUnclusteredProcessed: result.totalUnclusteredProcessed,
      clustersCreated: result.clustersCreated,
      articlesClustered: result.articlesClustered,
    };
    return { ...clusteringResult };
  }
}
