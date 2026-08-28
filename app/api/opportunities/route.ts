import { NextResponse } from 'next/server';
import { getPool } from '@/src/db/index';

export interface OpportunityResponseItem {
  id: number;
  cluster_id: number;
  type: 'business' | 'innovation' | 'investment';
  title: string;
  short_description: string;
  long_description: string;
  feasibility_score: number;
  impact_score: number;
  time_to_market_score: number;
  probability_score: number;
  band: 'red' | 'orange' | 'green';
  risks: string[];
  assumptions: string[];
  source_count: number;
  created_at: string;
  cluster_title?: string;
  dominant_sector?: string;
  primary_region?: string;
  source_articles?: Array<{ title: string; url: string; country_code: string }>;
}

const MOCK_OPPORTUNITIES: OpportunityResponseItem[] = [
  {
    id: 101,
    cluster_id: 1,
    type: 'business',
    title: 'Solar Microgrid & Localized Battery Storage Deployment',
    short_description: 'Capitalize on new tariff concessions and clean energy subsidies to build modular industrial microgrids.',
    long_description: 'Recent policy announcements in India and the EU have unlocked substantial subsidies for commercial microgrid installations. By bundling lithium-iron-phosphate (LFP) battery storage with local rooftop solar, energy developers can reduce industrial grid dependence by up to 40% while generating recurring capacity lease revenues.',
    feasibility_score: 84.0,
    impact_score: 91.5,
    time_to_market_score: 78.0,
    probability_score: 85.8,
    band: 'green',
    risks: [
      'Supply chain lead-time fluctuations for battery cells',
      'State-level grid interconnection approval delays',
    ],
    assumptions: [
      'Industrial electricity tariffs remain above ₹8.5/kWh',
      'Subsidy tax credits remain guaranteed for 36 months',
    ],
    source_count: 5,
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    cluster_title: 'India Clean Energy Policy & Solar Subsidies',
    dominant_sector: 'energy',
    primary_region: 'IN',
    source_articles: [
      {
        title: 'India Extends Solar Subsidies for Manufacturing Parks',
        url: 'https://news.example.com/india-solar-subsidy-2026',
        country_code: 'IN',
      },
      {
        title: 'Global Energy Transition Investment Reaches New High',
        url: 'https://news.example.com/global-energy-transition-2026',
        country_code: 'GLOBAL',
      },
    ],
  },
  {
    id: 102,
    cluster_id: 1,
    type: 'innovation',
    title: 'AI-Driven Supply Chain Bottleneck & Tariff Risk Engine',
    short_description: 'Deploy real-time predictive risk analytics for cross-border freight and tariff changes.',
    long_description: 'With frequent regulatory and trade shifts across North America, Europe, and Asia-Pacific, logistics operations face unexpected margin erosion. This solution ingests GDELT trade signals, shipping port API metrics, and regulatory updates to generate pre-emptive rerouting and hedging recommendations for enterprise exporters.',
    feasibility_score: 88.0,
    impact_score: 86.0,
    time_to_market_score: 85.0,
    probability_score: 86.6,
    band: 'green',
    risks: [
      'API rate limit barriers on legacy port data systems',
      'Model precision requirements for niche trade codes',
    ],
    assumptions: [
      'Exporters willing to pay premium SaaS subscriptions for supply-chain risk mitigation',
    ],
    source_count: 8,
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    cluster_title: 'Global Trade Policy & Logistics Risk Shift',
    dominant_sector: 'logistics',
    primary_region: 'GLOBAL',
    source_articles: [
      {
        title: 'Port Congestion and Tariff Adjustments Impact Freight Routes',
        url: 'https://news.example.com/freight-tariff-impact-2026',
        country_code: 'US',
      },
    ],
  },
  {
    id: 103,
    cluster_id: 2,
    type: 'investment',
    title: 'Advanced Semiconductor Packaging & OSAT Co-Investment',
    short_description: 'Co-invest in specialized chip packaging plants supported by government capital grants.',
    long_description: 'Semiconductor manufacturers are aggressively expanding Outsourced Semiconductor Assembly and Test (OSAT) units in South Asia. State-level incentive packages matching up to 50% of capital expenditure present a high-yield opportunity for strategic private equity and venture syndicates.',
    feasibility_score: 72.0,
    impact_score: 95.0,
    time_to_market_score: 60.0,
    probability_score: 78.8,
    band: 'green',
    risks: [
      'High initial CapEx commitments',
      'Specialized cleanroom equipment procurement timelines',
    ],
    assumptions: [
      'State government disburses CapEx matching grants within 180 days',
    ],
    source_count: 6,
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    cluster_title: 'Semiconductor Fab & OSAT Incentive Program',
    dominant_sector: 'technology',
    primary_region: 'IN',
    source_articles: [
      {
        title: 'Government Approves Incentive Package for OSAT Facilities',
        url: 'https://news.example.com/osat-chip-incentives-2026',
        country_code: 'IN',
      },
    ],
  },
  {
    id: 104,
    cluster_id: 3,
    type: 'business',
    title: 'Healthtech Tele-Diagnostics Platform for Rural Clinics',
    short_description: 'Offer diagnostic AI hardware kits bundled with remote specialist consultation pipelines.',
    long_description: 'Regulatory approvals for AI diagnostic devices have accelerated across emerging economies. Launching portable diagnostic kits (ECG, blood panel, ultrasound) for tier-2/3 clinics enables rapid triage and recurring telemedicine subscriptions.',
    feasibility_score: 65.0,
    impact_score: 70.0,
    time_to_market_score: 60.0,
    probability_score: 66.0,
    band: 'orange',
    risks: [
      'Regulatory compliance for medical data handling',
      'Internet connectivity bandwidth in remote regions',
    ],
    assumptions: [
      'Clinics adopt pay-per-test billing model',
    ],
    source_count: 4,
    created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    cluster_title: 'Healthtech Regulatory Fast-Track Approvals',
    dominant_sector: 'healthtech',
    primary_region: 'IN',
    source_articles: [
      {
        title: 'Health Ministry Expedites AI Diagnostic Approvals',
        url: 'https://news.example.com/health-ai-approvals-2026',
        country_code: 'IN',
      },
    ],
  },
  {
    id: 105,
    cluster_id: 4,
    type: 'innovation',
    title: 'Fintech Embedded Supply Chain Factoring for SMBs',
    short_description: 'Automate invoice discounting using verified purchase orders and logistics tracking data.',
    long_description: 'SMB manufacturing suppliers face liquidity gaps due to 90-day payment cycles. Integrating invoice factoring into ERPs backed by real-time logistics milestones drastically reduces underwriting risk for non-bank financial companies (NBFCs).',
    feasibility_score: 60.0,
    impact_score: 62.0,
    time_to_market_score: 55.0,
    probability_score: 59.8,
    band: 'orange',
    risks: [
      'Credit default spikes during macro downturns',
      'Integration friction with legacy accounting software',
    ],
    assumptions: [
      'NBFC partner provides baseline lending liquidity',
    ],
    source_count: 3,
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    cluster_title: 'Digital B2B Credit & Factoring Reform',
    dominant_sector: 'fintech',
    primary_region: 'IN',
    source_articles: [
      {
        title: 'Central Bank Issues Guidelines for Digital Factoring Platforms',
        url: 'https://news.example.com/digital-factoring-guidelines',
        country_code: 'IN',
      },
    ],
  },
  {
    id: 106,
    cluster_id: 5,
    type: 'investment',
    title: 'Urban EV Fleet Fast-Charging Hub Development',
    short_description: 'Acquire high-traffic real estate lots for high-speed commercial EV fleet charging hubs.',
    long_description: 'Commercial delivery fleets (2W/3W/4W) are rapidly electrifying. High-power DC fast-charging hubs strategically situated near logistics distribution centers offer predictable asset-backed yields.',
    feasibility_score: 35.0,
    impact_score: 42.0,
    time_to_market_score: 30.0,
    probability_score: 36.8,
    band: 'red',
    risks: [
      'Substation transformer utility delays',
      'Land lease cost inflation in tier-1 metro hubs',
    ],
    assumptions: [
      'Commercial fleet adoption accelerates 3x over 24 months',
    ],
    source_count: 2,
    created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    cluster_title: 'EV Infrastructure Subsidies & Fleet Transition',
    dominant_sector: 'energy',
    primary_region: 'IN',
    source_articles: [
      {
        title: 'Commercial Fleets Transition to EV Delivery Units',
        url: 'https://news.example.com/ev-fleet-transition-2026',
        country_code: 'IN',
      },
    ],
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const band = searchParams.get('band');
  const sector = searchParams.get('sector');
  const region = searchParams.get('region');
  const type = searchParams.get('type');
  const search = searchParams.get('search');
  const sort = searchParams.get('sort') || 'highest_probability';

  try {
    if (process.env.DATABASE_URL) {
      const pool = getPool();
      let queryText = `
        SELECT
          o.*,
          c.title AS cluster_title,
          c.dominant_sector,
          c.primary_region
        FROM opportunities o
        LEFT JOIN story_clusters c ON o.cluster_id = c.id
        WHERE 1=1
      `;
      const queryParams: any[] = [];
      let paramIdx = 1;

      if (band && band !== 'all') {
        queryText += ` AND o.band = $${paramIdx++}`;
        queryParams.push(band);
      }
      if (sector && sector !== 'all') {
        queryText += ` AND c.dominant_sector = $${paramIdx++}`;
        queryParams.push(sector.toLowerCase());
      }
      if (region && region !== 'all') {
        queryText += ` AND c.primary_region = $${paramIdx++}`;
        queryParams.push(region.toUpperCase());
      }
      if (type && type !== 'all') {
        queryText += ` AND o.type = $${paramIdx++}`;
        queryParams.push(type.toLowerCase());
      }
      if (search) {
        queryText += ` AND (o.title ILIKE $${paramIdx} OR o.short_description ILIKE $${paramIdx} OR o.long_description ILIKE $${paramIdx})`;
        queryParams.push(`%${search}%`);
        paramIdx++;
      }

      if (sort === 'highest_probability') {
        queryText += ` ORDER BY o.probability_score DESC, o.created_at DESC`;
      } else if (sort === 'most_recent') {
        queryText += ` ORDER BY o.created_at DESC`;
      } else if (sort === 'impact') {
        queryText += ` ORDER BY o.impact_score DESC`;
      } else {
        queryText += ` ORDER BY o.probability_score DESC`;
      }

      const dbRes = await pool.query(queryText, queryParams);
      return NextResponse.json({
        success: true,
        source: 'database',
        count: dbRes.rows.length,
        opportunities: dbRes.rows,
      });
    }
  } catch (err: any) {
    console.warn('[API Opportunities Route] Database query fallback:', err.message);
  }

  // Fallback to mock data filter logic
  let filtered = [...MOCK_OPPORTUNITIES];

  if (band && band !== 'all') {
    filtered = filtered.filter((o) => o.band === band);
  }
  if (sector && sector !== 'all') {
    filtered = filtered.filter((o) => o.dominant_sector?.toLowerCase() === sector.toLowerCase());
  }
  if (region && region !== 'all') {
    filtered = filtered.filter((o) => o.primary_region?.toUpperCase() === region.toUpperCase());
  }
  if (type && type !== 'all') {
    filtered = filtered.filter((o) => o.type === type);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (o) =>
        o.title.toLowerCase().includes(q) ||
        o.short_description.toLowerCase().includes(q) ||
        o.long_description.toLowerCase().includes(q)
    );
  }

  if (sort === 'highest_probability') {
    filtered.sort((a, b) => b.probability_score - a.probability_score);
  } else if (sort === 'most_recent') {
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (sort === 'impact') {
    filtered.sort((a, b) => b.impact_score - a.impact_score);
  }

  return NextResponse.json({
    success: true,
    source: 'mock',
    count: filtered.length,
    opportunities: filtered,
  });
}
