import { VoyageAIClient } from 'voyageai';
// '@/src/...' alias resolves under both Next (Turbopack) and tsx (tsconfig paths);
// relative '../db/index.js' only works under tsx and breaks the app bundler.
import { query } from '@/src/db/index';
import { env } from '@/src/config/env';

/**
 * Voyage AI embedding gateway for Opportunity Earth semantic search.
 *
 * Model: voyage-4 (current generation, 32,000-token context, 200M free tokens)
 * Output: 1024 dimensions — matches the opportunities.embedding vector(1024)
 * column and its HNSW vector_cosine_ops index on Neon.
 */

export const EMBEDDING_MODEL = 'voyage-4';
export const EMBEDDING_DIMENSIONS = 1024;

/** Voyage embed endpoint accepts at most 128 inputs per request. */
const MAX_BATCH_SIZE = 128;

/**
 * Minimum spacing between successive Voyage embed API calls. The free tier
 * allows 3 requests/minute, so calls are spaced ~22s apart. Override with
 * VOYAGE_MIN_INTERVAL_MS on paid tiers.
 */
const MIN_EMBED_INTERVAL_MS = Math.max(0, env.VOYAGE_MIN_INTERVAL_MS);
/** Pause before each HTTP 429 retry; after MAX_429_RETRIES attempts the error propagates. */
const RETRY_429_PAUSE_MS = 22_000;
const MAX_429_RETRIES = 3;

/** Timestamp of the last embed API call (module-level, per process). */
let lastEmbedAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Waits until the next embed call is at least MIN_EMBED_INTERVAL_MS after the previous one. */
async function throttleEmbed(): Promise<void> {
  const elapsed = Date.now() - lastEmbedAt;
  if (lastEmbedAt > 0 && elapsed < MIN_EMBED_INTERVAL_MS) {
    const waitMs = MIN_EMBED_INTERVAL_MS - elapsed;
    console.warn(
      `[Voyage Rate Limiter] spacing embed call ${(waitMs / 1000).toFixed(1)}s to respect the 3 RPM free tier...`
    );
    await sleep(waitMs);
  }
}

/**
 * Rate-limited Voyage embed call: spaces requests MIN_EMBED_INTERVAL_MS apart
 * and retries HTTP 429 up to 3 times with a 22s pause between attempts before
 * letting the error propagate (callers soft-fail: rows keep embedding NULL
 * for the generate-embeddings worker to backfill).
 */
async function rateLimitedEmbed(
  request: Parameters<VoyageAIClient['embed']>[0]
): Promise<Awaited<ReturnType<VoyageAIClient['embed']>>> {
  const client = getVoyageClient();
  for (let attempt = 0; ; attempt++) {
    await throttleEmbed();
    lastEmbedAt = Date.now();
    try {
      return await client.embed(request);
    } catch (err: any) {
      const isRateLimit =
        err?.statusCode === 429 || /status code: 429|\b429\b/.test(String(err?.message || ''));
      if (!isRateLimit || attempt >= MAX_429_RETRIES) throw err;
      console.warn(
        `[Voyage Rate Limiter] HTTP 429 on embed (attempt ${attempt + 1}/${MAX_429_RETRIES + 1}). ` +
          `Retrying in ${RETRY_429_PAUSE_MS / 1000}s...`
      );
      await sleep(RETRY_429_PAUSE_MS);
    }
  }
}

declare global {
  // eslint-disable-next-line no-var
  var voyageClient: VoyageAIClient | undefined;
}

export function getVoyageClient(): VoyageAIClient {
  if (!globalThis.voyageClient) {
    const apiKey = (env.VOYAGE_API_KEY || '').trim();
    if (!apiKey) {
      throw new Error('VOYAGE_API_KEY environment variable is not defined (.env / .env.local).');
    }
    globalThis.voyageClient = new VoyageAIClient({ apiKey });
  }
  return globalThis.voyageClient;
}

/** Raw shape needed to build an embedding payload for one opportunity. */
export interface EmbeddingSourceRecord {
  title: string;
  sector?: string | null;
  country_code?: string | null;
  short_description?: string | null;
  core_problem?: string | null;
  catalysts?: string[] | null;
}

/**
 * Builds the comprehensive contextual string sent to Voyage for an opportunity.
 * Full fields, no truncation — voyage-4's 32k context comfortably covers this.
 */
export function buildEmbeddingInput(record: EmbeddingSourceRecord): string {
  return [
    `Opportunity: ${record.title}`,
    `Sector: ${record.sector || 'General'}`,
    `Region: ${record.country_code}`,
    `Summary: ${record.short_description}`,
    `Core Problem: ${record.core_problem || ''}`,
    `Catalysts: ${(record.catalysts || []).join(', ')}`,
  ].join('\n');
}

/** Embeds a list of documents (stored opportunities) in batches of ≤128. */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const vectors: number[][] = [];

  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);
    const res = await rateLimitedEmbed({
      input: batch,
      model: EMBEDDING_MODEL,
      inputType: 'document',
      outputDimension: EMBEDDING_DIMENSIONS,
      truncation: false,
    });
    const data = (res as { data?: Array<{ embedding?: number[] }> }).data || [];
    if (data.length !== batch.length) {
      throw new Error(`Voyage returned ${data.length} embeddings for a batch of ${batch.length}`);
    }
    for (const item of data) {
      const vec = item.embedding;
      if (!vec || vec.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`Expected ${EMBEDDING_DIMENSIONS} dimensions, got ${vec ? vec.length : 'none'}`);
      }
      vectors.push(vec);
    }
  }

  return vectors;
}

/** Embeds a single search query (input_type 'query' — asymmetric retrieval). */
export async function embedQuery(queryText: string): Promise<number[]> {
  const res = await rateLimitedEmbed({
    input: queryText,
    model: EMBEDDING_MODEL,
    inputType: 'query',
    outputDimension: EMBEDDING_DIMENSIONS,
    truncation: false,
  });
  const vec = (res as { data?: Array<{ embedding?: number[] }> }).data?.[0]?.embedding;
  if (!vec || vec.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Expected ${EMBEDDING_DIMENSIONS} dimensions for query, got ${vec ? vec.length : 'none'}`);
  }
  return vec;
}

export interface SemanticSearchResult {
  id: number;
  title: string;
  type: string;
  band: string;
  short_description: string | null;
  probability_score: number;
  dominant_sector: string | null;
  primary_region: string | null;
  /** Cosine similarity from the vector leg (0 when the row matched via FTS only). */
  vector_similarity: number;
  /** ts_rank_cd cover-density score from the lexical leg (0 when matched via vectors only). */
  text_score: number;
  /** Reciprocal rank fusion score: 1/(60 + vector_rank) + 1/(60 + text_rank). */
  rrf_score: number;
}

/** Hybrid search options: RRF fusion of voyage-4 vector similarity and BM25-style FTS. */
export interface SearchOptions {
  limit?: number;
  /** Minimum vector similarity for vector-leg matches; text-only matches always pass. Default 0.22. */
  minSimilarity?: number;
}

/**
 * Hybrid semantic + lexical search over opportunities using Reciprocal Rank
 * Fusion (k = 60). The query is embedded with voyage-4 (input_type 'query')
 * for the vector leg, while websearch_to_tsquery drives the tsvector leg;
 * both rankings are fused so a result ranks highly if either mode favors it.
 */
export async function searchOpportunities(
  queryText: string,
  options: SearchOptions = {}
): Promise<SemanticSearchResult[]> {
  const limit = options.limit ?? 10;
  const minSimilarity = options.minSimilarity ?? 0.22;

  const vector = await embedQuery(queryText);
  // JSON.stringify of a number[] yields '[0.1,0.2,...]' — exactly the pgvector text format
  const vectorLiteral = JSON.stringify(vector);

  const res = await query<SemanticSearchResult>(
    `WITH vector_matches AS (
       SELECT
         id,
         1 - (embedding <=> $1::vector) AS similarity,
         ROW_NUMBER() OVER (ORDER BY embedding <=> $1::vector) AS rank
       FROM opportunities
       WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT 25
     ),
     text_matches AS (
       SELECT
         id,
         ts_rank_cd(text_search_vector, websearch_to_tsquery('english', $2)) AS text_score,
         ROW_NUMBER() OVER (ORDER BY ts_rank_cd(text_search_vector, websearch_to_tsquery('english', $2)) DESC) AS rank
       FROM opportunities
       WHERE text_search_vector @@ websearch_to_tsquery('english', $2)
       LIMIT 25
     )
     SELECT
       o.id,
       o.title,
       o.type,
       o.band,
       o.short_description,
       o.probability_score,
       c.dominant_sector,
       c.primary_region,
       COALESCE(v.similarity, 0) AS vector_similarity,
       COALESCE(t.text_score, 0) AS text_score,
       (COALESCE(1.0 / (60 + v.rank), 0.0) + COALESCE(1.0 / (60 + t.rank), 0.0)) AS rrf_score
     FROM opportunities o
     LEFT JOIN story_clusters c ON o.cluster_id = c.id
     LEFT JOIN vector_matches v ON o.id = v.id
     LEFT JOIN text_matches t ON o.id = t.id
     WHERE (v.id IS NOT NULL OR t.id IS NOT NULL)
       AND (v.similarity IS NULL OR v.similarity >= $3)
     ORDER BY rrf_score DESC
     LIMIT $4;`,
    [vectorLiteral, queryText, minSimilarity, limit]
  );

  return res.rows;
}
