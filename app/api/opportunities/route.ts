export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getPool } from '@/src/db/index';
import { OPPORTUNITY_SELECT_SQL, enrichOpportunity } from '@/src/services/opportunityFeed';

export interface OpportunityResponseItem {
  id: number;
  cluster_id: number;
  type: 'business' | 'innovation' | 'investment';
  title: string;
  short_description: string;
  long_description: string;
  core_problem?: string;
  detailed_problem_breakdown?: string;
  case_example?: string;
  actionable_venture_model?: string;
  specific_catalysts?: string[];
  feasibility_score: number;
  impact_score: number;
  time_to_market_score: number;
  probability_score: number;
  band: 'red' | 'orange' | 'green';
  risks: string[];
  assumptions: string[];
  source_count: number;
  created_at: string;
  updated_at?: string;
  cluster_title?: string;
  dominant_sector?: string;
  primary_region?: string;
  /** Aliases of dominant_sector/primary_region (COALESCEd — never NULL) */
  sector?: string;
  region?: string;
  source_articles?: Array<{ title: string; url: string; country_code: string }>;
  /** Pin placement on the 3D globe — capital anchor for priority markets */
  latitude?: number;
  longitude?: number;
  /** Cluster Goldstein tone delta feeding this opportunity (−10 … +10) */
  goldstein_delta?: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const band = searchParams.get('band');
  const sector = searchParams.get('sector');
  const region = searchParams.get('region');
  const type = searchParams.get('type');
  const search = searchParams.get('search');
  const sort = searchParams.get('sort') || '';
  const id = searchParams.get('id');

  if (id !== null && (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1)) {
    return NextResponse.json({ success: false, error: 'Invalid opportunity id.' }, { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { success: false, error: 'Database not configured: DATABASE_URL is missing.' },
      { status: 503 }
    );
  }

  // Explicit column list — deliberately excludes the 1024-dim `embedding`
  // vector column, which would otherwise ship megabytes over the wire.
  let queryText = OPPORTUNITY_SELECT_SQL;
  const queryParams: unknown[] = [];
  // All `?` placeholders in a clause share one parameter (the search clause
  // reuses the same %term% across its three ILIKE predicates).
  const addFilter = (clause: string, value: unknown) => {
    queryParams.push(value);
    queryText += ` ${clause.replaceAll('?', `$${queryParams.length}`)}`;
  };

  if (id !== null) {
    addFilter(`AND o.id = ?`, Number(id));
  }
  if (band && band !== 'all') {
    addFilter(`AND o.band = ?`, band);
  }
  if (sector && sector !== 'all') {
    // Case-insensitive on both sides so 'Energy' in clusters matches 'energy' from the sidebar
    addFilter(`AND LOWER(c.dominant_sector) = LOWER(?)`, sector);
  }
  if (region && region !== 'all') {
    addFilter(`AND c.primary_region = ?`, region.toUpperCase());
  }
  if (type && type !== 'all') {
    addFilter(`AND o.type = ?`, type.toLowerCase());
  }
  if (search) {
    addFilter(
      `AND (o.title ILIKE ? OR o.short_description ILIKE ? OR o.long_description ILIKE ?)`,
      `%${search}%`
    );
  }

  // Default ordering is feasibility-first; the named sorts back the UI's
  // sort control, which refetches with ?sort= on change.
  switch (sort) {
    case 'highest_probability':
      queryText += ` ORDER BY o.probability_score DESC, o.created_at DESC`;
      break;
    case 'most_recent':
      queryText += ` ORDER BY o.created_at DESC`;
      break;
    case 'impact':
      queryText += ` ORDER BY o.impact_score DESC`;
      break;
    default:
      queryText += ` ORDER BY o.feasibility_score DESC, o.created_at DESC`;
  }

  try {
    const pool = getPool();
    const dbRes = await pool.query(queryText, queryParams);
    // Pin placement: capital anchor for IN/US/CN/JP, country centroid otherwise
    const enriched = dbRes.rows.map(enrichOpportunity);
    return NextResponse.json({
      success: true,
      source: 'database',
      count: enriched.length,
      opportunities: enriched,
    });
  } catch (err) {
    console.error('[API Opportunities Route] Query failed:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load opportunities from database.' },
      { status: 500 }
    );
  }
}
