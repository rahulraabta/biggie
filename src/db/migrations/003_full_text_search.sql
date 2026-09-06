-- Migration 003: Full-Text Search (BM25-ready lexical retrieval) for Hybrid Search
-- Adds a generated tsvector column over the opportunity's core text fields
-- with a GIN index, enabling lexical ranking alongside the existing voyage-4
-- vector similarity search (hybrid retrieval).

-- 1. Generated tsvector column: always in sync with title/short_description/core_problem
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS text_search_vector tsvector
GENERATED ALWAYS AS (
  to_tsvector('english',
    coalesce(title, '') || ' ' ||
    coalesce(short_description, '') || ' ' ||
    coalesce(core_problem, '')
  )
) STORED;

-- 2. GIN index for fast full-text matching
CREATE INDEX IF NOT EXISTS idx_opportunities_fts
ON opportunities USING gin(text_search_vector);
