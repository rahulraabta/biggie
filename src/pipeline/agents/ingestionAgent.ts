import { BaseAgent } from './baseAgent.js';
import { AgentType, PipelineEvent, IngestionTaskPayload, IngestionResultPayload } from '../types.js';
import { runIngestion } from '@/scripts/ingest-gdelt';

export class IngestionAgent extends BaseAgent {
  readonly agentType: AgentType = 'ingestion';

  protected async executeTask(event: PipelineEvent): Promise<Record<string, unknown>> {
    const payload = event.payload as IngestionTaskPayload;
    const metrics = await runIngestion({
      dryRun: payload.dryRun,
      maxLines: payload.maxLines,
      urlOverride: payload.urlOverride,
    });
    const result: IngestionResultPayload = {
      totalProcessed: metrics.totalProcessed,
      filteredRelevant: metrics.filteredRelevant,
      insertedCount: metrics.insertedCount,
      updatedCount: metrics.updatedCount,
      errorCount: metrics.errorCount,
      durationMs: metrics.durationMs,
    };
    return { ...result };
  }
}
