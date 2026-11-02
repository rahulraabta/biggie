-- Migration 007: per-call LLM usage + cost tracking.
CREATE TABLE IF NOT EXISTS llm_usage (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT REFERENCES pipeline_events(id) ON DELETE SET NULL,
  agent_type TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  cached BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_llm_usage_created ON llm_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_usage_agent_created ON llm_usage (agent_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_usage_event ON llm_usage (event_id);
