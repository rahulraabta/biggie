-- Migration 002: Vector Embeddings for Semantic Opportunity Search
-- Enables the pgvector extension and adds a 1024-dim embedding column
-- (Cohere embed-*-v3.0 dimension) to opportunities, with an HNSW cosine index.

-- 1. Ensure the pgvector extension is available and active
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column (all existing rows remain NULL until backfilled)
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS embedding vector(1024);

-- 3. HNSW index for approximate nearest-neighbor search (cosine distance)
CREATE INDEX IF NOT EXISTS idx_opportunities_embedding
ON opportunities USING hnsw (embedding vector_cosine_ops);
