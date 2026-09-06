-- Vector similarity search for opportunity embeddings (requires pgvector extension)
CREATE EXTENSION IF NOT EXISTS vector;

-- Table for grouping related news items into opportunities
CREATE TABLE IF NOT EXISTS story_clusters (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    topic_label VARCHAR(100),
    dominant_sector VARCHAR(100),
    primary_region VARCHAR(50),
    article_count INT DEFAULT 0,
    category VARCHAR(100),
    summary TEXT,
    opportunity_score NUMERIC(5,2) DEFAULT 0.0,
    source_type VARCHAR(50) DEFAULT 'GDELT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing normalized, filtered global news articles, GDELT events & Horizon signals
CREATE TABLE IF NOT EXISTS articles (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL DEFAULT 'gdelt',
    source_type VARCHAR(50) DEFAULT 'GDELT',
    source_platform VARCHAR(50) DEFAULT 'GDELT',
    external_id VARCHAR(100),
    title TEXT,
    url TEXT UNIQUE NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    country_code VARCHAR(10),
    actor_1 VARCHAR(255),
    actor_2 VARCHAR(255),
    event_code VARCHAR(20),
    goldstein_scale NUMERIC(4,1),
    num_mentions INT DEFAULT 1,
    avg_tone NUMERIC(5,2),
    relevance_score NUMERIC(5,3) DEFAULT 0.000,
    matched_sectors TEXT[] DEFAULT '{}',
    community_comments JSONB DEFAULT '[]'::jsonb,
    raw_payload JSONB DEFAULT '{}'::jsonb,
    cluster_id INT REFERENCES story_clusters(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for AI-generated actionable business, innovation, and investment opportunities
CREATE TABLE IF NOT EXISTS opportunities (
    id SERIAL PRIMARY KEY,
    cluster_id INT REFERENCES story_clusters(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('business', 'innovation', 'investment')),
    title VARCHAR(255) NOT NULL,
    short_description TEXT,
    long_description TEXT,
    historical_context TEXT,
    core_problem TEXT,
    business_solution_explained TEXT,
    detailed_problem_breakdown TEXT,
    case_example TEXT,
    actionable_venture_model TEXT,
    specific_catalysts JSONB DEFAULT '[]'::jsonb,
    feasibility_score NUMERIC(5,2) NOT NULL CHECK (feasibility_score BETWEEN 0 AND 100),
    impact_score NUMERIC(5,2) NOT NULL CHECK (impact_score BETWEEN 0 AND 100),
    time_to_market_score NUMERIC(5,2) NOT NULL CHECK (time_to_market_score BETWEEN 0 AND 100),
    probability_score NUMERIC(5,2) NOT NULL CHECK (probability_score BETWEEN 0 AND 100),
    band VARCHAR(10) NOT NULL CHECK (band IN ('red', 'orange', 'green')),
    risks JSONB DEFAULT '[]'::jsonb,
    assumptions JSONB DEFAULT '[]'::jsonb,
    source_count INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for ingestion run tracking for auditability and metrics logging
CREATE TABLE IF NOT EXISTS ingestion_runs (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    run_date DATE NOT NULL,
    total_processed INT NOT NULL DEFAULT 0,
    filtered_relevant INT NOT NULL DEFAULT 0,
    inserted_count INT NOT NULL DEFAULT 0,
    updated_count INT NOT NULL DEFAULT 0,
    error_count INT NOT NULL DEFAULT 0,
    is_dry_run BOOLEAN NOT NULL DEFAULT FALSE,
    duration_ms INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for performance querying
CREATE INDEX IF NOT EXISTS idx_articles_url ON articles(url);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
CREATE INDEX IF NOT EXISTS idx_articles_relevance_score ON articles(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_articles_country_code ON articles(country_code);
CREATE INDEX IF NOT EXISTS idx_articles_cluster_id ON articles(cluster_id);
CREATE INDEX IF NOT EXISTS idx_articles_source_type_published ON articles(source_type, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_story_clusters_dominant_sector ON story_clusters(dominant_sector);
CREATE INDEX IF NOT EXISTS idx_story_clusters_primary_region ON story_clusters(primary_region);
CREATE INDEX IF NOT EXISTS idx_story_clusters_source_type ON story_clusters(source_type);

CREATE INDEX IF NOT EXISTS idx_opportunities_cluster_id ON opportunities(cluster_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_type ON opportunities(type);
CREATE INDEX IF NOT EXISTS idx_opportunities_band_sector_prob ON opportunities(band, probability_score DESC);

-- Vector embedding column for semantic similarity search over opportunities
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS embedding vector(1024);

-- HNSW index for fast approximate nearest-neighbor lookup (cosine distance)
CREATE INDEX IF NOT EXISTS idx_opportunities_embedding ON opportunities USING hnsw (embedding vector_cosine_ops);
