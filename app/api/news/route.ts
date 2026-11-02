import { NextResponse } from 'next/server';

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: false, error: 'News feed unavailable.' }, { status: 503 });
  }

  try {
    const { getPool } = await import('@/src/db/index');
    const { rows } = await getPool().query(`
      SELECT id, title, url, country_code, published_at
      FROM articles
      WHERE LOWER(source) = 'gdelt'
        AND title IS NOT NULL AND title <> ''
        AND published_at >= NOW() - INTERVAL '24 hours'
      ORDER BY published_at DESC, id DESC
      LIMIT 20
    `);
    return NextResponse.json({ success: true, events: rows }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[News feed]', error);
    return NextResponse.json({ success: false, error: 'News feed unavailable.' }, { status: 503 });
  }
}
