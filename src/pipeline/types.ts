export type AgentType = 'ingestion' | 'clustering' | 'opportunity';

export type EventType = 'task' | 'result' | 'error' | 'status';

export type EventStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'dead_letter';

export interface PipelineEvent {
  id: number;
  run_id: string;
  agent_type: AgentType;
  event_type: EventType;
  status: EventStatus;
  payload: Record<string, unknown>;
  error_message: string | null;
  retry_count: number;
  failed_at: Date | null;
  dead_lettered_at: Date | null;
  created_at: Date;
  updated_at: Date;
  locked_at: Date | null;
  locked_by: string | null;
}

export interface IngestionTaskPayload {
  dryRun?: boolean;
  maxLines?: number;
  urlOverride?: string;
}

export interface ClusteringTaskPayload {
  dryRun?: boolean;
  limit?: number;
}

export interface OpportunityTaskPayload {
  dryRun?: boolean;
  limit?: number;
}

export interface IngestionResultPayload {
  totalProcessed: number;
  filteredRelevant: number;
  insertedCount: number;
  updatedCount: number;
  errorCount: number;
  durationMs: number;
}

export interface ClusteringResultPayload {
  totalUnclusteredProcessed: number;
  clustersCreated: number;
  articlesClustered: number;
}

export interface OpportunityResultPayload {
  totalClustersProcessed: number;
  opportunitiesGenerated: number;
  opportunitiesEmbedded: number;
  opportunitiesByBand: Record<string, number>;
  opportunitiesByType: Record<string, number>;
}
