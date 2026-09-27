-- Migration 005: retry tracking + dead-letter support for pipeline_events.
ALTER TABLE pipeline_events
  ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dead_lettered_at TIMESTAMPTZ;

-- Widen status constraint. If a CHECK exists on status, drop and recreate it.
DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'pipeline_events'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE pipeline_events DROP CONSTRAINT %I', cname);
  END IF;
  ALTER TABLE pipeline_events
    ADD CONSTRAINT pipeline_events_status_check
    CHECK (status IN ('pending','running','completed','failed','dead_letter'));
END $$;

CREATE INDEX IF NOT EXISTS idx_pipeline_events_dead_letter
  ON pipeline_events (agent_type, dead_lettered_at DESC)
  WHERE status = 'dead_letter';
