-- Table for grouping related news items into opportunities
CREATE TABLE IF NOT EXISTS story_clusters (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    summary TEXT,
    opportunity_score NUMERIC(5,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing normalized, filtered global news articles & GDELT events
CREATE TABLE IF NOT EXISTS articles (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL DEFAULT 'gdelt',
    external_id VARCHAR(100),
    