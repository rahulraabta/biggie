import { NextResponse } from 'next/server';
import { getPool } from '@/src/db/index';

export interface HorizonIncomingItem {
  id: string;
  source_type?: string;
  source_platform?: string;
  title: string;
  url: string;
  author?: string;
  published_at?: string;
  relevance_score?: number;
  summary?: string;
  matched_sectors?: string[];
  community_comments?: any[];
  raw_payload?: Record<string, any>;
}

export async function POST(request: Request) {
  try {
    const expectedSecret = process.env.HORIZON_WEBHOOK_SECRET || 'horizon-secret-key-12345';
    const reqSecret =
      request.headers.get('X-Horizon-Secret') ||
      request.headers.get('x-horizon-secret') ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (!reqSecret || reqSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing HORIZON_WEBHOOK_SECRET token.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const items: HorizonIncomingItem[] = Array.isArray(body.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: 'No Horizon items found in payload.',
      });
    }

    let insertedCount = 0;
    let skippedCount = 0;

    console.log("Received Horizon Payload:", body);

    if (process.env.DATABASE_URL) {
      const pool = getPool();
      for (const item of items) {
        try {
          const sourceType = 'HORIZON';
          const sourcePlatform = item.source_platform || item.source_type || 'HackerNews';
          const matchedSectors = Array.isArray(item.matched_sectors) ? item.matched_sectors : ['general'];
          const communityComments = JSON.stringify(item.community_comments || []);
          const rawPayload = JSON.stringify(item.raw_payload || {});
          const publishedAt = item.published_at ? new Date(item.published_at) : new Date();

          // UPSERT into articles table on URL conflict
          const res = await pool.query(
            `INSERT INTO articles (
              source, source_type, source_platform, external_id, title, url,
              published_at, relevance_score, matched_sectors, community_comments, raw_payload
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (url) DO UPDATE SET
              relevance_score = EXCLUDED.relevance_score,
              community_comments = EXCLUDED.community_comments,
              raw_payload = EXCLUDED.raw_payload
            RETURNING id;`,
            [
              'horizon',
              sourceType,
              sourcePlatform,
              item.id,
              item.title,
              item.url,
              publishedAt,
              item.relevance_score || 7.5,
              matchedSectors,
              communityComments,
              rawPayload,
            ]
          );

          if (res.rowCount && res.rowCount > 0) {
            insertedCount++;
          }
        } catch (err: any) {
          console.warn(`[Horizon Ingestion Webhook] Error inserting item "${item.title}":`, err.message);
          skippedCount++;
        }
      }
    } else {
      console.log(`[Horizon Ingestion Webhook - Mock Mode] Received ${items.length} items successfully.`);
      insertedCount = items.length;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully ingested Horizon items. Inserted/Updated: ${insertedCount}, Skipped: ${skippedCount}.`,
      count: insertedCount,
      skipped: skippedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Horizon Ingestion Webhook Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}