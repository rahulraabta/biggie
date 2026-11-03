export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json({ success: false, error: 'Heatmap unavailable.' }, { status: 503 });
  try {
    const { getPool } = await import('@/src/db/index');
    const { rows } = await getPool().query<{ code: string; count: number }>(`
      SELECT UPPER(COALESCE(NULLIF(o.validated_output->'research'->>'region', ''), c.primary_region, 'GLOBAL')) AS code,
        COUNT(*)::int AS count
      FROM opportunities o LEFT JOIN story_clusters c ON c.id = o.cluster_id
      WHERE o.created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY 1 ORDER BY count DESC, code
    `);
    return NextResponse.json({ success: true, regions: rows, window: '24h', total: rows.reduce((sum, row) => sum + row.count, 0) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[Heatmap]', error);
    return NextResponse.json({ success: false, error: 'Heatmap unavailable.' }, { status: 503 });
  }
}
