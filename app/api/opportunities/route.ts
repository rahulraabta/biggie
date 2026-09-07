import { NextResponse } from 'next/server';
import { getPool } from '@/src/db/index';
import { getPinCoordinates } from '@/src/utils/geoUtils';

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

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { success: false, error: 'Database not configured: DATABASE_URL is missing.' },
      { status: 503 }
    );
  }

  // Explicit column list — deliberately excludes the 1024-dim `embedding`
  // vector column, which would otherwise ship megabytes over the wire.
  let queryText = `
    SELECT
      o.id,
      o.cluster_id,
      o.type,
      o.title,
      o.short_description,
      o.long_description,
      o.core_problem,
      o.detailed_problem_breakdown,
      o.case_example,
      o.actionable_venture_model,
      o.specific_catalysts,
      o.feasibility_score,
      o.impact_score,
      o.time_to_market_score,
      o.probability_score,
      o.band,
      o.risks,
      o.assumptions,
      o.source_count,
      o.created_at,
      o.updated_at,
      c.title AS cluster_title,
      c.dominant_sector,
      c.primary_region,
      COALESCE(c.dominant_sector, 'General') AS sector,
      COALESCE(c.primary_region, 'Global') AS region,
      (SELECT AVG(a.goldstein_scale) FROM articles a WHERE a.cluster_id = c.id) AS goldstein_delta
    FROM opportunities o
    LEFT JOIN story_clusters c ON o.cluster_id = c.id
    WHERE 1=1
  `;
  const queryParams: unknown[] = [];
  // All `?` placeholders in a clause share one parameter (the search clause
  // reuses the same %term% across its three ILIKE predicates).
  const addFilter = (clause: string, value: unknown) => {
    queryParams.push(value);
    queryText += ` ${clause.replaceAll('?', `$${queryParams.length}`)}`;
  };

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
    const enriched = dbRes.rows.map((row: OpportunityResponseItem) => {
      const pin = getPinCoordinates(row.primary_region || 'GLOBAL');
      return { ...row, latitude: pin.lat, longitude: pin.lng };
    });
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
