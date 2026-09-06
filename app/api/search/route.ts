import { NextResponse } from 'next/server';
import { searchOpportunities } from '../../../src/services/embeddingService';

/**
 * Semantic similarity search over opportunities.
 *
 * GET /api/search?q=<natural language query>&limit=<n, default 5>
 *
 * Embeds the query with Voyage AI voyage-4 (input_type 'query') and fuses
 * vector similarity (pgvector HNSW <=>) with BM25-style full-text ranking
 * (tsvector GIN) via Reciprocal Rank Fusion.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const limitParam = searchParams.get('limit');
  const limit = Math.min(Math.max(parseInt(limitParam || '10', 10) || 10, 1), 50);
  // Optional vector-similarity floor (0–1); falls through to the service default (0.22)
  const minsimParam = searchParams.get('minsim');
  const minSimilarity = minsimParam !== null ? Math.min(Math.max(parseFloat(minsimParam) || 0, 0), 1) : undefined;

  if (!q) {
    return NextResponse.json(
      { success: false, error: "Missing required query parameter 'q'." },
      { status: 400 }
    );
  }

  try {
    const results = await searchOpportunities(q, { limit, minSimilarity });
    return NextResponse.json({
      success: true,
      source: 'database',
      query: q,
      model: 'voyage-4',
      strategy: 'hybrid-rrf',
      count: results.length,
      results,
    });
  } catch (err: any) {
    console.error('[API Search Route] Semantic search failed:', err.message);
    return NextResponse.json(
      { success: false, error: 'Semantic search failed.', detail: err.message },
      { status: 500 }
    );
  }
}
