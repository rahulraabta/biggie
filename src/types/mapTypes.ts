export interface GeoLocation {
  lat: number;
  lng: number;
}

export type GeographicGranularity = 'country' | 'region' | 'anchor';

export interface OpportunityMapPoint {
  id: string | number;
  countryCode: string;
  countryName: string;
  lat: number;
  lng: number;
  signalCount: number;
  greenCount: number;
  orangeCount: number;
  redCount: number;
  dominantSector: string;
  topOpportunityTitle: string;
  topOpportunityType: 'business' | 'innovation' | 'investment';
  topOpportunityBand: 'red' | 'orange' | 'green';
  topProbabilityScore: number;
  granularity?: GeographicGranularity;
}

export interface ArticleHeadlineItem {
  id: number;
  title: string;
  url: string;
  country_code: string;
  matched_sectors: string[];
  published_at: string;
  source: string;
  avg_tone?: number;
}

export interface ClusterSummary {
  id: number;
  title: string;
  topic_label: string;
  dominant_sector: string;
  primary_region: string;
  article_count: number;
  created_at: string;
}

export interface OpportunitySummaryItem {
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

export interface CountryIntelligenceSummary {
  code: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  totalSignals: number;
  totalOpportunities: number;
  bandCounts: { green: number; orange: number; red: number };
  sectorCounts: Record<string, number>;
  clusters: ClusterSummary[];
  opportunities: OpportunitySummaryItem[];
  topHeadlines: ArticleHeadlineItem[];
  granularity?: GeographicGranularity;
  lastUpdated?: string;
  timeWindow?: '24h' | '7d' | '30d';
}

export interface RegionalIntelligenceSummary {
  countryCode: string;
  regionName: string;
  lat: number;
  lng: number;
  totalSignals: number;
  clusters: ClusterSummary[];
  opportunities: OpportunitySummaryItem[];
  headlines: ArticleHeadlineItem[];
  granularity?: GeographicGranularity;
  lastUpdated?: string;
  timeWindow?: '24h' | '7d' | '30d';
}

export interface FocusMarketSummaryItem {
  id: string;
  name: string;
  kind: 'country' | 'aggregation';
  signalCount: number;
  greenCount: number;
  dominantSector: string;
}

export interface MapOverviewResponse {
  success: boolean;
  source: 'database' | 'mock';
  totalGlobalSignals: number;
  totalCountriesActive: number;
  totalOpportunities: number;
  bandCounts: { green: number; orange: number; red: number };
  points: OpportunityMapPoint[];
  lastUpdated?: string;
  timeWindow?: '24h' | '7d' | '30d';
  focusMarketsSummary?: FocusMarketSummaryItem[];
}
