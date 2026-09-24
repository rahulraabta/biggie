import { query } from '@/src/db/index';
import { PipelineEvent, AgentType } from './types.js';

/**
 * Creates a pending task event for a pipeline stage.
 * `payload` stores the task inputs; results are merged into it on completion.
 */
export async function createTaskEvent(
  runId: string,
  agentType: AgentType,
  payload: Record<string, unknown> = {}
): Promise<PipelineEvent> {
  const res = await query<PipelineEvent>(
    `INSERT INTO pipeline_events (run_id, agent_type, event_type, status, payload)
     VALUES ($1, $2, 'task', 'pending', $3)
     RETURNING *`,
    [runId, agentType, JSON.stringify(payload)]
  );
  return res.rows[0];
}

/**
 * Atomically claims the oldest pending task for an agent.
 * FOR UPDATE SKIP LOCKED prevents two workers from claiming the same row.
 */
export async function claimNextTask(
  agentType: AgentType,
  workerId: string
): Promise<PipelineEvent | null> {
  const res = await query<PipelineEvent>(
    `UPDATE pipeline_events
     SET status = 'running', locked_at = NOW(), locked_by = $1, updated_at = NOW()
     WHERE id = (
       SELECT id FROM pipeline_events
       WHERE status = 'pending' AND agent_type = $2
       ORDER BY created_at ASC, id ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     RETURNING *`,
    [workerId, agentType]
  );
  return res.rows[0] || null;
}

/**
 * Claims a specific event by id (used when the orchestrator dispatches a
 * targeted worker). FOR UPDATE SKIP LOCKED guards against a duplicate
 * dispatcher racing for the same event.
 */
export async function claimEventById(
  eventId: number,
  workerId: string
): Promise<PipelineEvent | null> {
  const res = await query<PipelineEvent>(
    `UPDATE pipeline_events
     SET status = 'running', locked_at = NOW(), locked_by = $1, updated_at = NOW()
     WHERE id = $2 AND status = 'pending'
     RETURNING *`,
    [workerId, eventId]
  );
  return res.rows[0] || null;
}

/**
 * Requeues tasks whose worker died without finishing (lock older than staleMs).
 * Returns the number of events reset to pending.
 */
export async function reclaimStaleTasks(staleMs: number): Promise<number> {
  const res = await query<{ count: string }>(
    `UPDATE pipeline_events
     SET status = 'pending', locked_at = NULL, locked_by = NULL, updated_at = NOW()
     WHERE status = 'running'
       AND locked_at < NOW() - ($1::text || ' milliseconds')::interval
     RETURNING id`,
    [String(staleMs)]
  );
  return res.rowCount ?? 0;
}

/** Marks an event completed, merging the result into its payload. */
export async function markCompleted(
  eventId: number,
  resultPayload: Record<string, unknown>
): Promise<void> {
  await query(
    `UPDATE pipeline_events
     SET status = 'completed',
         payload = payload || $1::jsonb,
         error_message = NULL,
         locked_at = NULL,
         updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(resultPayload), eventId]
  );
}

/** Marks an event failed with an error message. */
export async function markFailed(eventId: number, errorMessage: string): Promise<void> {
  await query(
    `UPDATE pipeline_events
     SET status = 'failed',
         error_message = $1,
         locked_at = NULL,
         updated_at = NOW()
     WHERE id = $2`,
    [errorMessage, eventId]
  );
}

/** Read-only poll: all events for a run in creation order. */
export async function getRunEvents(runId: string): Promise<PipelineEvent[]> {
  const res = await query<PipelineEvent>(
    `SELECT * FROM pipeline_events
     WHERE run_id = $1
     ORDER BY created_at ASC, id ASC`,
    [runId]
  );
  return res.rows;
}

/** Read-only poll: terminal event for one stage of a run, if any. */
export async function getStageResult(
  runId: string,
  agentType: AgentType
): Promise<PipelineEvent | null> {
  const res = await query<PipelineEvent>(
    `SELECT * FROM pipeline_events
     WHERE run_id = $1 AND agent_type = $2
     ORDER BY id DESC
     LIMIT 1`,
    [runId, agentType]
  );
  const row = res.rows[0];
  if (!row) return null;
  return row.status === 'completed' || row.status === 'failed' ? row : null;
}

/** True when no pending/running events remain for the run. */
export async function isRunComplete(runId: string): Promise<boolean> {
  const res = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM pipeline_events
     WHERE run_id = $1 AND status IN ('pending', 'running')`,
    [runId]
  );
  return parseInt(res.rows[0].count, 10) === 0;
}

/** True when any event for the run failed. */
export async function hasRunFailed(runId: string): Promise<boolean> {
  const res = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM pipeline_events
     WHERE run_id = $1 AND status = 'failed'`,
    [runId]
  );
  return parseInt(res.rows[0].count, 10) > 0;
}
