import { NextResponse } from 'next/server';
import { getPool } from '@/src/db/index';

export async function GET(request: Request) {
  try {
    if (process.env.DATABASE_URL) {
      const pool = getPool();
      const dbRes = await pool.query(`
        SELECT c.*, json_agg(a.*) AS articles
        FROM story_clusters c
        LEFT JOIN articles a ON a.cluster_id = c.id
        GROUP BY c.id
        ORDER BY c.created_at DESC
        LIMIT 50;
      `);

      return NextResponse.json({
        success: true,
        source: 'database',
        clusters: dbRes.rows,
      });
    }
  } catch (err: any) {
    console.warn('[API Clusters Route] Database query fallback:', err.message);
  }

  const mockClusters = [
    {
      id: 1,
      title: 'India Clean Energy Policy & Solar Subsidies',
      topic_label: 'Energy - IN',
      dominant_sector: 'energy',
      primary_region: 'IN',
      article_count: 5,
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      title: 'Semiconductor Fab & OSAT Incentive Program',
      topic_label: 'Technology - IN',
      dominant_sector: 'technology',
      primary_region: 'IN',
      article_count: 6,
      created_at: new Date().toISOString(),
    },
  ];

  return NextResponse.json({
    success: true,
    source: 'mock',
    clusters: mockClusters,
  });
}
