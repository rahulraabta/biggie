import { NextResponse } from 'next/server';
import { searchOpportunities } from '../../../src/services/embeddingService';

/**
 * Semantic similarity search over opportunities.
 *
 * GET /api/search?q=<natural language query>&limit=<n, default 5>
 *
 * Embeds the query with Voyage AI voyage-4 (input_type 'query') and ranks
 * opportunities by cosine distance (<=>) against the HNSW
 * idx_opportunities_embedding index on Neon.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const limitParam = searchParams.get('limit');
  const limit = Math.min(Math.max(parseInt(limitParam || '5', 10) || 5, 1), 50);

  if (!q) {
    return NextResponse.json(
      { success: false, error: "Missing required query parameter 'q'." },
      { status: 400 }
    );
  }

  try {
    const results = await searchOpportunities(q, limit);
    return NextResponse.json({
      success: true,
      source: 'database',
      query: q,
      model: 'voyage-4',
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
