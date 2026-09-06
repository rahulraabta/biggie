import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { VoyageAIClient } from 'voyageai';
// '@/src/...' alias resolves under both Next (Turbopack) and tsx (tsconfig paths);
// relative '../db/index.js' only works under tsx and breaks the app bundler.
import { query } from '@/src/db/index';

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

declare global {
  // eslint-disable-next-line no-var
  var voyageClient: VoyageAIClient | undefined;
}

export function getVoyageClient(): VoyageAIClient {
  if (!globalThis.voyageClient) {
    const apiKey = (process.env.VOYAGE_API_KEY || '').trim();
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
  const client = getVoyageClient();
  const vectors: number[][] = [];

  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);
    const res = await client.embed({
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
  const client = getVoyageClient();
  const res = await client.embed({
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
  distance: number;
  similarity: number;
}

/**
 * Semantic similarity search over opportunities: embeds the query with
 * voyage-4 (input_type 'query') and ranks by cosine distance (<=>) against
 * the HNSW idx_opportunities_embedding index on Neon.
 */
export async function searchOpportunities(queryText: string, limit = 5): Promise<SemanticSearchResult[]> {
  const vector = await embedQuery(queryText);
  // JSON.stringify of a number[] yields '[0.1,0.2,...]' — exactly the pgvector text format
  const vectorLiteral = JSON.stringify(vector);

  const res = await query<SemanticSearchResult & { distance: number }>(
    `SELECT
       o.id,
       o.title,
       o.type,
       o.band,
       o.short_description,
       o.probability_score,
       c.dominant_sector,
       c.primary_region,
       o.embedding <=> $1::vector AS distance
     FROM opportunities o
     LEFT JOIN story_clusters c ON o.cluster_id = c.id
     WHERE o.embedding IS NOT NULL
     ORDER BY distance
     LIMIT $2;`,
    [vectorLiteral, limit]
  );

  return res.rows.map((row) => ({
    ...row,
    // cosine distance 0 = identical direction → similarity 1.0
    similarity: Math.round((1 - row.distance) * 1000) / 1000,
  }));
}
