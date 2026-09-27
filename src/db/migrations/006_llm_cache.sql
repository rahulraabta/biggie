-- Migration 006: LLM response cache keyed by an idempotency hash.
CREATE TABLE IF NOT EXISTS llm_cache (
  idempotency_key  TEXT PRIMARY KEY,
  model            TEXT NOT NULL,
  prompt_hash      TEXT NOT NULL,
  response         JSONB NOT NULL,
  prompt_tokens    INT,
  completion_tokens INT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_llm_cache_created ON llm_cache (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_cache_prompt_hash ON llm_cache (prompt_hash);
