-- Migration 004: Multi-agent pipeline coordination table.
-- Workers claim tasks via UPDATE ... WHERE id = (SELECT ... FOR UPDATE SKIP LOCKED
-- LIMIT 1) so concurrent orchestrators/workers never process the same event.
-- The partial polling index below backs that claim query and the orchestrator's
-- read-only status polls.

CREATE TABLE IF NOT EXISTS pipeline_events (
  id SERIAL PRIMARY KEY,
  run_id UUID NOT NULL,
  agent_type VARCHAR(50) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  locked_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_pipeline_events_run_id ON pipeline_events(run_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_status ON pipeline_events(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_agent_type ON pipeline_events(agent_type);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_polling ON pipeline_events(status, agent_type) WHERE status IN ('pending', 'running');
