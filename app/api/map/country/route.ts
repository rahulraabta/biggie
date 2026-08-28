import { NextResponse } from 'next/server';
import { getPool } from '@/src/db/index';
import { getCountryCoordinates } from '@/src/utils/geoUtils';
import { CountryIntelligenceSummary } from '@/src/types/mapTypes';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get('code') || '').trim().toUpperCase();
  const twParam = searchParams.get('timeWindow');
  const timeWindow: '24h' | '7d' | '30d' =
    twParam === '24h' || twParam === '7d' || twParam === '30d' ? twParam : '7d';

  if (!code || code.length < 2 || code.length > 10) {
    return NextResponse.json(
      { success: false, error: 'Valid country code parameter is required (e.g. ?code=IN).' },
      { status: 400 }
    );
  }

  const geo = getCountryCoordinates(code);

  try {
    if (process.env.DATABASE_URL) {
      const pool = getPool();

      // Fetch clusters for this country
      const clustersRes = await pool.query(
        `SELECT c.*, COUNT(a.id) AS article_count
         FROM story_clusters c
         LEFT JOIN articles a ON a.cluster_id = c.id
         WHERE c.primary_region = $1
         GROUP BY c.id
         ORDER BY c.created_at DESC
         LIMIT 20;`,
        [code]
      );

      // Fetch opportunities for this country
      const oppsRes = await pool.query(
        `SELECT o.*, c.title AS cluster_title, c.dominant_sector, c.primary_region
         FROM opportunities o
         JOIN story_clusters c ON o.cluster_id = c.id
         WHERE c.primary_region = $1
         ORDER BY o.probability_score DESC, o.created_at DESC
         LIMIT 20;`,
        [code]
      );

      // Fetch top headlines for this country
      const headlinesRes = await pool.query(
        `SELECT id, url, country_code, matched_sectors, published_at, source, avg_tone
         FROM articles
         WHERE country_code = $1
         ORDER BY relevance_score DESC, published_at DESC
         LIMIT 15;`,
        [code]
      );

      if (clustersRes.rows.length > 0 || oppsRes.rows.length > 0) {
        const sectorCounts: Record<string, number> = {};
        const bandCounts = { green: 0, orange: 0, red: 0 };

        oppsRes.rows.forEach((o) => {
          const band = (o.band || 'green') as 'green' | 'orange' | 'red';
          bandCounts[band] = (bandCounts[band] || 0) + 1;
          if (o.dominant_sector) {
            sectorCounts[o.dominant_sector] = (sectorCounts[o.dominant_sector] || 0) + 1;
          }
        });

        const countrySummary: CountryIntelligenceSummary = {
          code,
          name: geo.name,
          region: geo.name,
          lat: geo.lat,
          lng: geo.lng,
          totalSignals: headlinesRes.rows.length + clustersRes.rows.length * 2,
          totalOpportunities: oppsRes.rows.length,
          bandCounts,
          sectorCounts,
          clusters: clustersRes.rows.map((c) => ({
            id: c.id,
            title: c.title,
            topic_label: c.topic_label || `${c.dominant_sector} - ${code}`,
            dominant_sector: c.dominant_sector || 'business',
            primary_region: c.primary_region || code,
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
          topHeadlines: headlinesRes.rows.map((h) => ({
            id: h.id,
            title: h.url ? new URL(h.url).hostname.replace('www.', '') + ' News Event' : 'GDELT Event Signal',
            url: h.url,
            country_code: h.country_code || code,
            matched_sectors: h.matched_sectors || ['business'],
            published_at: h.published_at || new Date().toISOString(),
            source: h.source || 'GDELT',
            avg_tone: h.avg_tone,
          })),
          granularity: 'country',
          lastUpdated: new Date().toISOString(),
          timeWindow,
        };

        return NextResponse.json({
          success: true,
          source: 'database',
          country: countrySummary,
        });
      }
    }
  } catch (err: any) {
    console.warn(`[API Map Country Route] Database query fallback for ${code}:`, err?.message || err);
  }

  // Deterministic mock response for offline/dry-run mode
  const mockCountrySummary: CountryIntelligenceSummary = {
    code,
    name: geo.name,
    region: geo.name,
    lat: geo.lat,
    lng: geo.lng,
    totalSignals: 18,
    totalOpportunities: 3,
    bandCounts: { green: 2, orange: 1, red: 0 },
    sectorCounts: { energy: 8, technology: 5, logistics: 3, fintech: 2 },
    clusters: [
      {
        id: 101,
        title: `${geo.name} Clean Energy Policy & Solar Subsidies`,
        topic_label: `Energy - ${code}`,
        dominant_sector: 'energy',
        primary_region: code,
        article_count: 5,
        created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      },
      {
        id: 102,
        title: `${geo.name} Semiconductor Fab & OSAT Incentive Program`,
        topic_label: `Technology - ${code}`,
        dominant_sector: 'technology',
        primary_region: code,
        article_count: 6,
        created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      },
      {
        id: 103,
        title: `${geo.name} Digital B2B Factoring & Trade Credit Reform`,
        topic_label: `Fintech - ${code}`,
        dominant_sector: 'fintech',
        primary_region: code,
        article_count: 4,
        created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      },
    ],
    opportunities: [
      {
        id: 201,
        cluster_id: 101,
        type: 'business',
        title: `${geo.name} Solar Microgrid & Localized Battery Storage Deployment`,
        short_description: `Capitalize on localized tariff concessions and clean energy subsidies in ${geo.name} to build modular industrial microgrids.`,
        long_description: `Recent regulatory announcements in ${geo.name} have unlocked target subsidies for commercial microgrids. Combining modular lithium storage with rooftop solar enables up to 40% reduction in peak industrial tariffs.`,
        feasibility_score: 84.0,
        impact_score: 91.5,
        time_to_market_score: 78.0,
        probability_score: 85.8,
        band: 'green',
        risks: ['Cell procurement timelines', 'Grid interconnection clearance'],
        assumptions: ['Tariffs remain above regional benchmark', 'Subsidy credits valid for 36 months'],
        source_count: 5,
        created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        cluster_title: `${geo.name} Clean Energy Policy & Solar Subsidies`,
        dominant_sector: 'energy',
        primary_region: code,
      },
      {
        id: 202,
        cluster_id: 102,
        type: 'investment',
        title: `${geo.name} Advanced OSAT Chip Packaging Hub Joint Venture`,
        short_description: `Co-invest in specialized semiconductor assembly plants supported by state CapEx matching grants.`,
        long_description: `State incentives matching up to 50% of CapEx present high-yield opportunities for private equity and venture syndicates in ${geo.name}.`,
        feasibility_score: 72.0,
        impact_score: 95.0,
        time_to_market_score: 60.0,
        probability_score: 78.8,
        band: 'green',
        risks: ['High initial CapEx', 'Cleanroom equipment procurement lead time'],
        assumptions: ['State grants disbursed within 180 days'],
        source_count: 6,
        created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
        cluster_title: `${geo.name} Semiconductor Fab & OSAT Incentive Program`,
        dominant_sector: 'technology',
        primary_region: code,
      },
      {
        id: 203,
        cluster_id: 103,
        type: 'innovation',
        title: `${geo.name} Embedded B2B Invoice Factoring for Industrial SMBs`,
        short_description: `Automate invoice discounting using verified purchase orders and logistics telemetry.`,
        long_description: `SMB manufacturing suppliers face liquidity gaps due to 90-day payment terms. Factoring backed by real-time logistics milestones drastically reduces default risk.`,
        feasibility_score: 60.0,
        impact_score: 62.0,
        time_to_market_score: 55.0,
        probability_score: 59.8,
        band: 'orange',
        risks: ['Default spikes in macro downturns', 'Legacy ERP integration friction'],
        assumptions: ['NBFC partner provides baseline lending liquidity'],
        source_count: 4,
        created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        cluster_title: `${geo.name} Digital B2B Factoring & Trade Credit Reform`,
        dominant_sector: 'fintech',
        primary_region: code,
      },
    ],
    topHeadlines: [
      {
        id: 301,
        title: `${geo.name} Government Approves Extended Clean Energy Tariff Concessions`,
        url: `https://news.example.com/${code.toLowerCase()}-clean-energy-2026`,
        country_code: code,
        matched_sectors: ['energy', 'regulatory'],
        published_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
        source: 'GDELT Global News Feed',
        avg_tone: 4.8,
      },
      {
        id: 302,
        title: `Semiconductor Manufacturers Expand Assembly Facilities in ${geo.name}`,
        url: `https://news.example.com/${code.toLowerCase()}-semiconductor-expansion`,
        country_code: code,
        matched_sectors: ['technology', 'manufacturing'],
        published_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        source: 'GDELT Global News Feed',
        avg_tone: 5.2,
      },
      {
        id: 303,
        title: `Digital Factoring Guidelines Released for B2B Commercial Suppliers`,
        url: `https://news.example.com/${code.toLowerCase()}-digital-factoring-news`,
        country_code: code,
        matched_sectors: ['fintech'],
        published_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
        source: 'GDELT Global News Feed',
        avg_tone: 3.1,
      },
    ],
    granularity: 'country',
    lastUpdated: new Date().toISOString(),
    timeWindow,
  };

  return NextResponse.json({
    success: true,
    source: 'mock',
    country: mockCountrySummary,
  });
}
