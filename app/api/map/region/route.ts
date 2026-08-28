import { NextResponse } from 'next/server';
import { getPool } from '@/src/db/index';
import { getCountryCoordinates } from '@/src/utils/geoUtils';
import { RegionalIntelligenceSummary } from '@/src/types/mapTypes';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const countryCode = (searchParams.get('country') || '').trim().toUpperCase();
  const regionName = (searchParams.get('region') || '').trim();
  const twParam = searchParams.get('timeWindow');
  const timeWindow: '24h' | '7d' | '30d' =
    twParam === '24h' || twParam === '7d' || twParam === '30d' ? twParam : '7d';

  if (!countryCode || !regionName) {
    return NextResponse.json(
      { success: false, error: 'Both country code and region parameters are required (e.g. ?country=IN&region=Karnataka).' },
      { status: 400 }
    );
  }

  const geo = getCountryCoordinates(countryCode);

  try {
    if (process.env.DATABASE_URL) {
      const pool = getPool();

      const clustersRes = await pool.query(
        `SELECT c.*, COUNT(a.id) AS article_count
         FROM story_clusters c
         LEFT JOIN articles a ON a.cluster_id = c.id
         WHERE c.primary_region = $1 AND (c.title ILIKE $2 OR c.topic_label ILIKE $2)
         GROUP BY c.id
         ORDER BY c.created_at DESC
         LIMIT 10;`,
        [countryCode, `%${regionName}%`]
      );

      const oppsRes = await pool.query(
        `SELECT o.*, c.title AS cluster_title, c.dominant_sector, c.primary_region
         FROM opportunities o
         JOIN story_clusters c ON o.cluster_id = c.id
         WHERE c.primary_region = $1 AND (c.title ILIKE $2 OR o.title ILIKE $2 OR o.short_description ILIKE $2)
         ORDER BY o.probability_score DESC
         LIMIT 10;`,
        [countryCode, `%${regionName}%`]
      );

      const headlinesRes = await pool.query(
        `SELECT id, url, country_code, matched_sectors, published_at, source, avg_tone
         FROM articles
         WHERE country_code = $1
         ORDER BY relevance_score DESC
         LIMIT 10;`,
        [countryCode]
      );

      if (clustersRes.rows.length > 0 || oppsRes.rows.length > 0) {
        const regionalSummary: RegionalIntelligenceSummary = {
          countryCode,
          regionName,
          lat: geo.lat + 0.5,
          lng: geo.lng + 0.5,
          totalSignals: headlinesRes.rows.length + clustersRes.rows.length * 2,
          clusters: clustersRes.rows.map((c) => ({
            id: c.id,
            title: c.title,
            topic_label: c.topic_label || `${c.dominant_sector} - ${regionName}`,
            dominant_sector: c.dominant_sector || 'business',
            primary_region: c.primary_region || countryCode,
            article_count: parseInt(c.article_count || '1', 10),
            created_at: c.created_at || new Date().toISOString(),
          })),
          opportunities: oppsRes.rows.map((o) => ({
            id: o.id,
            cluster_id: o.cluster_id,
            type: o.type,
            title: o.title,
            short_description: o.short_description,
            long_description: o.long_description,
            feasibility_score: parseFloat(o.feasibility_score),
            impact_score: parseFloat(o.impact_score),
            time_to_market_score: parseFloat(o.time_to_market_score),
            probability_score: parseFloat(o.probability_score),
            band: o.band,
            risks: Array.isArray(o.risks) ? o.risks : typeof o.risks === 'string' ? JSON.parse(o.risks) : [],
            assumptions: Array.isArray(o.assumptions) ? o.assumptions : typeof o.assumptions === 'string' ? JSON.parse(o.assumptions) : [],
            source_count: o.source_count || 1,
            created_at: o.created_at || new Date().toISOString(),
            cluster_title: o.cluster_title,
            dominant_sector: o.dominant_sector,
            primary_region: o.primary_region,
          })),
          headlines: headlinesRes.rows.map((h) => ({
            id: h.id,
            title: h.url ? `${regionName} News: ${new URL(h.url).hostname.replace('www.', '')}` : `${regionName} Local Event Signal`,
            url: h.url,
            country_code: h.country_code || countryCode,
            matched_sectors: h.matched_sectors || ['business'],
            published_at: h.published_at || new Date().toISOString(),
            source: h.source || 'GDELT',
            avg_tone: h.avg_tone,
          })),
          granularity: 'anchor',
          lastUpdated: new Date().toISOString(),
          timeWindow,
        };

        return NextResponse.json({
          success: true,
          source: 'database',
          region: regionalSummary,
        });
      }
    }
  } catch (err: any) {
    console.warn(`[API Map Region Route] Database query fallback for ${countryCode} / ${regionName}:`, err?.message || err);
  }

  // Deterministic mock fallback
  const mockRegionalSummary: RegionalIntelligenceSummary = {
    countryCode,
    regionName,
    lat: geo.lat + 0.4,
    lng: geo.lng + 0.4,
    totalSignals: 8,
    clusters: [
      {
        id: 401,
        title: `${regionName} Industrial Zone Solar Storage Expansion`,
        topic_label: `Energy - ${regionName}`,
        dominant_sector: 'energy',
        primary_region: countryCode,
        article_count: 3,
        created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      },
      {
        id: 402,
        title: `${regionName} Electronics & Semiconductor Logistics Cluster`,
        topic_label: `Logistics - ${regionName}`,
        dominant_sector: 'logistics',
        primary_region: countryCode,
        article_count: 5,
        created_at: new Date(Date.now() - 7 * 3600 * 1000).toISOString(),
      },
    ],
    opportunities: [
      {
        id: 501,
        cluster_id: 401,
        type: 'business',
        title: `${regionName} Industrial Park Solar Storage Capacity Lease`,
        short_description: `Deploy modular 10MW LFP battery storage units tailored for manufacturing plants in ${regionName}.`,
        long_description: `Rapid commercial growth in ${regionName} has strained regional grid stability. Bundling microgrids with capacity lease contracts yields steady 18% IRR.`,
        feasibility_score: 86.0,
        impact_score: 89.0,
        time_to_market_score: 80.0,
        probability_score: 86.0,
        band: 'green',
        risks: ['Substation interconnection lead times'],
        assumptions: ['Peak power demand remains elevated'],
        source_count: 3,
        created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        cluster_title: `${regionName} Industrial Zone Solar Storage Expansion`,
        dominant_sector: 'energy',
        primary_region: countryCode,
      },
    ],
    headlines: [
      {
        id: 601,
        title: `${regionName} Port Authority Upgrades High-Speed Freight Cargo Terminals`,
        url: `https://news.example.com/${countryCode.toLowerCase()}-${regionName.toLowerCase().replace(/\s+/g, '-')}-port-expansion`,
        country_code: countryCode,
        matched_sectors: ['logistics', 'infrastructure'],
        published_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        source: 'GDELT Regional Stream',
        avg_tone: 4.5,
      },
      {
        id: 602,
        title: `Manufacturing Hub in ${regionName} Receives State Infrastructure Grant`,
        url: `https://news.example.com/${countryCode.toLowerCase()}-${regionName.toLowerCase().replace(/\s+/g, '-')}-grant`,
        country_code: countryCode,
        matched_sectors: ['manufacturing', 'investment'],
        published_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
        source: 'GDELT Regional Stream',
        avg_tone: 5.1,
      },
    ],
    granularity: 'anchor',
    lastUpdated: new Date().toISOString(),
    timeWindow,
  };

  return NextResponse.json({
    success: true,
    source: 'mock',
    region: mockRegionalSummary,
  });
}
