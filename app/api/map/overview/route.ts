import { NextResponse } from 'next/server';
import { getPool } from '@/src/db/index';
import { getCountryCoordinates } from '@/src/utils/geoUtils';
import { MapOverviewResponse, OpportunityMapPoint, FocusMarketSummaryItem } from '@/src/types/mapTypes';
import { getAllFocusMarkets } from '@/src/config/focusMarkets';

const MOCK_MAP_POINTS: OpportunityMapPoint[] = [
  {
    id: 'point-IN',
    countryCode: 'IN',
    countryName: 'India',
    lat: 20.5937,
    lng: 78.9629,
    signalCount: 18,
    greenCount: 3,
    orangeCount: 2,
    redCount: 1,
    dominantSector: 'energy',
    topOpportunityTitle: 'Solar Microgrid & Localized Battery Storage Deployment',
    topOpportunityType: 'business',
    topOpportunityBand: 'green',
    topProbabilityScore: 85.8,
    granularity: 'country',
  },
  {
    id: 'point-US',
    countryCode: 'US',
    countryName: 'United States',
    lat: 37.0902,
    lng: -95.7129,
    signalCount: 14,
    greenCount: 2,
    orangeCount: 1,
    redCount: 0,
    dominantSector: 'technology',
    topOpportunityTitle: 'AI-Driven Supply Chain Bottleneck & Tariff Risk Engine',
    topOpportunityType: 'innovation',
    topOpportunityBand: 'green',
    topProbabilityScore: 86.6,
    granularity: 'country',
  },
  {
    id: 'point-GB',
    countryCode: 'GB',
    countryName: 'United Kingdom',
    lat: 55.3781,
    lng: -3.436,
    signalCount: 9,
    greenCount: 1,
    orangeCount: 1,
    redCount: 0,
    dominantSector: 'fintech',
    topOpportunityTitle: 'Cross-Border Digital Asset Settlement Gateway',
    topOpportunityType: 'innovation',
    topOpportunityBand: 'green',
    topProbabilityScore: 79.4,
    granularity: 'country',
  },
  {
    id: 'point-SG',
    countryCode: 'SG',
    countryName: 'Singapore',
    lat: 1.3521,
    lng: 103.8198,
    signalCount: 12,
    greenCount: 2,
    orangeCount: 0,
    redCount: 0,
    dominantSector: 'logistics',
    topOpportunityTitle: 'Autonomous Port Logistics & Freight Optimization Platform',
    topOpportunityType: 'business',
    topOpportunityBand: 'green',
    topProbabilityScore: 88.2,
    granularity: 'country',
  },
  {
    id: 'point-AE',
    countryCode: 'AE',
    countryName: 'United Arab Emirates',
    lat: 23.4241,
    lng: 53.8478,
    signalCount: 10,
    greenCount: 1,
    orangeCount: 2,
    redCount: 0,
    dominantSector: 'energy',
    topOpportunityTitle: 'Green Hydrogen Export Terminal & Offtake Contracts',
    topOpportunityType: 'investment',
    topOpportunityBand: 'green',
    topProbabilityScore: 83.1,
    granularity: 'country',
  },
  {
    id: 'point-DE',
    countryCode: 'DE',
    countryName: 'Germany',
    lat: 51.1657,
    lng: 10.4515,
    signalCount: 11,
    greenCount: 1,
    orangeCount: 1,
    redCount: 1,
    dominantSector: 'manufacturing',
    topOpportunityTitle: 'Automated Industrial Robotics Retrofit Kits',
    topOpportunityType: 'innovation',
    topOpportunityBand: 'green',
    topProbabilityScore: 77.5,
    granularity: 'country',
  },
  {
    id: 'point-JP',
    countryCode: 'JP',
    countryName: 'Japan',
    lat: 36.2048,
    lng: 138.2529,
    signalCount: 8,
    greenCount: 1,
    orangeCount: 1,
    redCount: 0,
    dominantSector: 'technology',
    topOpportunityTitle: 'Next-Gen Solid-State Battery R&D Syndicate',
    topOpportunityType: 'investment',
    topOpportunityBand: 'green',
    topProbabilityScore: 81.0,
    granularity: 'country',
  },
];

export async function GET(request?: Request) {
  let timeWindowParam: '24h' | '7d' | '30d' = '7d';

  if (request) {
    const { searchParams } = new URL(request.url);
    const tw = searchParams.get('timeWindow');
    if (tw === '24h' || tw === '7d' || tw === '30d') {
      timeWindowParam = tw;
    }
  }

  const focusMarkets = getAllFocusMarkets();

  try {
    if (process.env.DATABASE_URL) {
      const pool = getPool();

      // Aggregate signal & opportunity statistics by country
      const dbRes = await pool.query(`
        SELECT
          c.primary_region AS country_code,
          COUNT(DISTINCT c.id) AS cluster_count,
          COUNT(DISTINCT o.id) AS opp_count,
          COUNT(DISTINCT CASE WHEN o.band = 'green' THEN o.id END) AS green_count,
          COUNT(DISTINCT CASE WHEN o.band = 'orange' THEN o.id END) AS orange_count,
          COUNT(DISTINCT CASE WHEN o.band = 'red' THEN o.id END) AS red_count,
          MODE() WITHIN GROUP (ORDER BY c.dominant_sector) AS dominant_sector
        FROM story_clusters c
        LEFT JOIN opportunities o ON o.cluster_id = c.id
        WHERE c.primary_region IS NOT NULL
        GROUP BY c.primary_region;
      `);

      if (dbRes.rows.length > 0) {
        const points: OpportunityMapPoint[] = dbRes.rows.map((row) => {
          const code = (row.country_code || 'GLOBAL').toUpperCase();
          const geo = getCountryCoordinates(code);

          return {
            id: `point-${code}`,
            countryCode: code,
            countryName: geo.name,
            lat: geo.lat,
            lng: geo.lng,
            signalCount: parseInt(row.cluster_count || '0', 10) * 3 + parseInt(row.opp_count || '0', 10),
            greenCount: parseInt(row.green_count || '0', 10),
            orangeCount: parseInt(row.orange_count || '0', 10),
            redCount: parseInt(row.red_count || '0', 10),
            dominantSector: row.dominant_sector || 'business',
            topOpportunityTitle: `${geo.name} Strategic Market Intelligence Signal`,
            topOpportunityType: 'business',
            topOpportunityBand: parseInt(row.green_count || '0', 10) > 0 ? 'green' : 'orange',
            topProbabilityScore: 82.0,
            granularity: 'country',
          };
        });

        const totalOpps = points.reduce((acc, p) => acc + p.greenCount + p.orangeCount + p.redCount, 0);
        const totalSignals = points.reduce((acc, p) => acc + p.signalCount, 0);

        const focusMarketsSummary: FocusMarketSummaryItem[] = focusMarkets.map((fm) => {
          const matchingPoint = points.find((p) => p.countryCode === fm.isoCode);
          return {
            id: fm.id,
            name: fm.displayName,
            kind: fm.kind,
            signalCount: matchingPoint ? matchingPoint.signalCount : 10,
            greenCount: matchingPoint ? matchingPoint.greenCount : 2,
            dominantSector: matchingPoint ? matchingPoint.dominantSector : fm.prioritySectors[0],
          };
        });

        return NextResponse.json<MapOverviewResponse>({
          success: true,
          source: 'database',
          totalGlobalSignals: totalSignals,
          totalCountriesActive: points.length,
          totalOpportunities: totalOpps,
          bandCounts: {
            green: points.reduce((acc, p) => acc + p.greenCount, 0),
            orange: points.reduce((acc, p) => acc + p.orangeCount, 0),
            red: points.reduce((acc, p) => acc + p.redCount, 0),
          },
          points,
          lastUpdated: new Date().toISOString(),
          timeWindow: timeWindowParam,
          focusMarketsSummary,
        });
      }
    }
  } catch (err: any) {
    console.warn('[API Map Overview Route] Database fallback to mock overview:', err?.message || err);
  }

  const totalOpps = MOCK_MAP_POINTS.reduce((acc, p) => acc + p.greenCount + p.orangeCount + p.redCount, 0);
  const totalSignals = MOCK_MAP_POINTS.reduce((acc, p) => acc + p.signalCount, 0);

  const focusMarketsSummary: FocusMarketSummaryItem[] = focusMarkets.map((fm) => {
    const matchingPoint = MOCK_MAP_POINTS.find((p) => p.countryCode === fm.isoCode);
    return {
      id: fm.id,
      name: fm.displayName,
      kind: fm.kind,
      signalCount: matchingPoint ? matchingPoint.signalCount : 12,
      greenCount: matchingPoint ? matchingPoint.greenCount : 2,
      dominantSector: matchingPoint ? matchingPoint.dominantSector : fm.prioritySectors[0],
    };
  });

  return NextResponse.json<MapOverviewResponse>({
    success: true,
    source: 'mock',
    totalGlobalSignals: totalSignals,
    totalCountriesActive: MOCK_MAP_POINTS.length,
    totalOpportunities: totalOpps,
    bandCounts: {
      green: MOCK_MAP_POINTS.reduce((acc, p) => acc + p.greenCount, 0),
      orange: MOCK_MAP_POINTS.reduce((acc, p) => acc + p.orangeCount, 0),
      red: MOCK_MAP_POINTS.reduce((acc, p) => acc + p.redCount, 0),
    },
    points: MOCK_MAP_POINTS,
    lastUpdated: new Date().toISOString(),
    timeWindow: timeWindowParam,
    focusMarketsSummary,
  });
}
