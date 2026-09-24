-- Migration 001: Horizon Intelligence Integration
-- Adds source_type, source_platform, and community_comments to articles and story_clusters.

-- 1. Update story_clusters table to track source origin (GDELT, HORIZON, or HYBRID cross-stream)
ALTER TABLE story_clusters
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'GDELT';

-- 2. Update articles table with Horizon source, platform, and community metadata columns
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'GDELT',
ADD COLUMN IF NOT EXISTS source_platform VARCHAR(50) DEFAULT 'GDELT',
ADD COLUMN IF NOT EXISTS community_comments JSONB DEFAULT '[]'::jsonb;

-- 3. Create index for fast 24-hour dual-stream querying across GDELT and Horizon
CREATE INDEX IF NOT EXISTS idx_articles_source_type_published ON articles(source_type, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_clusters_source_type ON story_clusters(source_type);
