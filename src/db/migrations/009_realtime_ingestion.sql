CREATE TABLE IF NOT EXISTS gdelt_seen_events (
  external_id TEXT PRIMARY KEY,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the ledger so events ingested before this worker are also deduplicated.
INSERT INTO gdelt_seen_events (external_id)
SELECT DISTINCT external_id FROM articles
WHERE LOWER(source) = 'gdelt' AND external_id IS NOT NULL AND external_id <> ''
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS gdelt_stream_state (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  last_export TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS opportunity_realtime_outbox (
  opportunity_id INTEGER PRIMARY KEY REFERENCES opportunities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_opportunity_outbox_pending
  ON opportunity_realtime_outbox(created_at) WHERE delivered_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_opportunities_created_cluster
  ON opportunities(created_at DESC, cluster_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_opportunity_payload
  ON pipeline_events USING GIN(payload) WHERE agent_type = 'opportunity';

CREATE OR REPLACE FUNCTION notify_opportunity_insert() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO opportunity_realtime_outbox(opportunity_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  PERFORM pg_notify('opportunity_inserted', NEW.id::text);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS opportunity_insert_realtime ON opportunities;
CREATE TRIGGER opportunity_insert_realtime AFTER INSERT ON opportunities
  FOR EACH ROW EXECUTE FUNCTION notify_opportunity_insert();
