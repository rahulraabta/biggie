ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS validated_output JSONB;
