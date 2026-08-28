export type FocusMarketId =
  | 'IN'
  | 'US'
  | 'GB'
  | 'SG'
  | 'AE'
  | 'DE'
  | 'JP'
  | 'EU'
  | 'GLOBAL'
  | 'ROW';

export type FocusMarketKind = 'country' | 'aggregation';

export interface CameraPreset {
  lat: number;
  lng: number;
  distance: number;
}

export interface RegionalHotspot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  sector: string;
  description?: string;
}

export interface FocusMarket {
  id: FocusMarketId;
  displayName: string;
  kind: FocusMarketKind;
  isoCode?: string; // Present ONLY for real countries
  camera: CameraPreset;
  accessibilityLabel: string;
  prioritySectors: string[];
  overviewDescription: string;
  hotspots?: RegionalHotspot[];
}

export const FOCUS_MARKETS: Record<FocusMarketId, FocusMarket> = {
  IN: {
    id: 'IN',
    displayName: 'India',
    kind: 'country',
    isoCode: 'IN',
    camera: { lat: 20.5937, lng: 78.9629, distance: 4.2 },
    accessibilityLabel: 'India market intelligence radar view',
    prioritySectors: ['energy', 'technology', 'fintech', 'manufacturing'],
    overviewDescription: 'Rapid expansion in clean energy microgrids, semiconductor OSAT facilities, and digital B2B trade financing.',
    hotspots: [
      { id: 'in-blr', name: 'Bengaluru', lat: 12.9716, lng: 77.5946, sector: 'technology', description: 'AI software labs & enterprise SaaS hubs' },
      { id: 'in-bom', name: 'Mumbai', lat: 19.076, lng: 72.8777, sector: 'fintech', description: 'Financial capital & digital invoice discounting' },
      { id: 'in-[del]', name: 'Delhi NCR', lat: 28.6139, lng: 77.209, sector: 'energy', description: 'Policy headquarters & EV charging networks' },
      { id: 'in-hyd', name: 'Hyderabad', lat: 17.385, lng: 78.4867, sector: 'pharmaceuticals', description: 'Biotech manufacturing & semiconductor packaging' },
      { id: 'in-maa', name: 'Chennai', lat: 13.0827, lng: 80.2707, sector: 'manufacturing', description: 'Automotive industrial hubs & solar microgrids' },
    ],
  },
  US: {
    id: 'US',
    displayName: 'United States',
    kind: 'country',
    isoCode: 'US',
    camera: { lat: 37.0902, lng: -95.7129, distance: 4.5 },
    accessibilityLabel: 'United States market intelligence radar view',
    prioritySectors: ['technology', 'artificial intelligence', 'energy', 'defense'],
    overviewDescription: 'High-density signals in generative AI infra, grid decarbonization, and supply chain reshoring.',
    hotspots: [
      { id: 'us-bay', name: 'San Francisco Bay Area', lat: 37.7749, lng: -122.4194, sector: 'artificial intelligence', description: 'Frontier AI model training & cloud infrastructure' },
      { id: 'us-nyc', name: 'New York', lat: 40.7128, lng: -74.006, sector: 'fintech', description: 'Institutional asset tokenization & algorithmic trading' },
      { id: 'us-aus', name: 'Austin', lat: 30.2672, lng: -97.7431, sector: 'energy', description: 'Next-gen battery gigafactories & clean tech' },
      { id: 'us-bos', name: 'Boston', lat: 42.3601, lng: -71.0589, sector: 'biotech', description: 'Therapeutic mRNA & clinical automation' },
      { id: 'us-sea', name: 'Seattle', lat: 47.6062, lng: -122.3321, sector: 'cloud', description: 'Distributed hyper-scaler data center clusters' },
    ],
  },
  GB: {
    id: 'GB',
    displayName: 'United Kingdom',
    kind: 'country',
    isoCode: 'GB',
    camera: { lat: 55.3781, lng: -3.436, distance: 4.2 },
    accessibilityLabel: 'United Kingdom market intelligence radar view',
    prioritySectors: ['fintech', 'biotech', 'clean energy', 'artificial intelligence'],
    overviewDescription: 'Focus on cross-border payment rails, quantum computing consortia, and offshore wind grids.',
    hotspots: [
      { id: 'gb-lon', name: 'London', lat: 51.5074, lng: -0.1278, sector: 'fintech', description: 'Digital asset clearing & cross-border banking' },
      { id: 'gb-cam', name: 'Cambridge', lat: 52.2053, lng: 0.1218, sector: 'biotech', description: 'Genomic research & AI drug discovery labs' },
      { id: 'gb-man', name: 'Manchester', lat: 53.4808, lng: -2.2426, sector: 'clean energy', description: 'Advanced materials & graphene battery tech' },
      { id: 'gb-edi', name: 'Edinburgh', lat: 55.9533, lng: -3.1883, sector: 'asset management', description: 'ESG investment syndicates & green finance' },
    ],
  },
  SG: {
    id: 'SG',
    displayName: 'Singapore',
    kind: 'country',
    isoCode: 'SG',
    camera: { lat: 1.3521, lng: 103.8198, distance: 3.8 },
    accessibilityLabel: 'Singapore market intelligence radar view',
    prioritySectors: ['logistics', 'fintech', 'maritime', 'wealth management'],
    overviewDescription: 'Global hub for autonomous port logistics, carbon credit exchanges, and SEA venture headquarters.',
    hotspots: [
      { id: 'sg-sin', name: 'Singapore', lat: 1.3521, lng: 103.8198, sector: 'logistics', description: 'Automated container port & trade finance gateway' },
    ],
  },
  AE: {
    id: 'AE',
    displayName: 'United Arab Emirates',
    kind: 'country',
    isoCode: 'AE',
    camera: { lat: 23.4241, lng: 53.8478, distance: 4.0 },
    accessibilityLabel: 'United Arab Emirates market intelligence radar view',
    prioritySectors: ['energy', 'logistics', 'artificial intelligence', 'real estate'],
    overviewDescription: 'Accelerating green hydrogen export corridors, sovereign AI compute, and logistics free zones.',
    hotspots: [
      { id: 'ae-dxb', name: 'Dubai', lat: 25.2048, lng: 55.2708, sector: 'logistics', description: 'Smart trade logistics & international crypto licensing' },
      { id: 'ae-auh', name: 'Abu Dhabi', lat: 24.4539, lng: 54.3773, sector: 'energy', description: 'Green hydrogen plants & sovereign wealth AI investment' },
    ],
  },
  DE: {
    id: 'DE',
    displayName: 'Germany',
    kind: 'country',
    isoCode: 'DE',
    camera: { lat: 51.1657, lng: 10.4515, distance: 4.2 },
    accessibilityLabel: 'Germany market intelligence radar view',
    prioritySectors: ['manufacturing', 'automotive', 'clean energy', 'robotics'],
    overviewDescription: 'Industrial automation retrofits, solid-state battery manufacturing, and Mittelstand digital upgrades.',
    hotspots: [
      { id: 'de-ber', name: 'Berlin', lat: 52.52, lng: 13.405, sector: 'technology', description: 'B2B SaaS ventures & climate-tech accelerators' },
      { id: 'de-muc', name: 'Munich', lat: 48.1351, lng: 11.582, sector: 'automotive', description: 'Electric vehicle platforms & autonomous robotics' },
      { id: 'de-fra', name: 'Frankfurt', lat: 50.1109, lng: 8.6821, sector: 'fintech', description: 'Eurozone banking infrastructure & data centers' },
      { id: 'de-ham', name: 'Hamburg', lat: 53.5511, lng: 9.9937, sector: 'maritime', description: 'Offshore wind power distribution & port automation' },
    ],
  },
  JP: {
    id: 'JP',
    displayName: 'Japan',
    kind: 'country',
    isoCode: 'JP',
    camera: { lat: 36.2048, lng: 138.2529, distance: 4.2 },
    accessibilityLabel: 'Japan market intelligence radar view',
    prioritySectors: ['technology', 'robotics', 'semiconductors', 'energy'],
    overviewDescription: 'Next-gen solid-state battery syndicates, humanoid robotics manufacturing, and hydrogen imports.',
    hotspots: [
      { id: 'jp-tyo', name: 'Tokyo', lat: 35.6762, lng: 139.6503, sector: 'technology', description: 'AI robotics & global electronics headquarters' },
      { id: 'jp-osa', name: 'Osaka', lat: 34.6937, lng: 135.5023, sector: 'energy', description: 'Battery chemistry R&D & industrial automation' },
      { id: 'jp-kyo', name: 'Kyoto', lat: 35.0116, lng: 135.7681, sector: 'materials', description: 'Precision sensor components & ceramic insulators' },
      { id: 'jp-fuk', name: 'Fukuoka', lat: 33.5904, lng: 130.4017, sector: 'startup', description: 'Regulatory sandbox zone for East Asian trade' },
    ],
  },
  EU: {
    id: 'EU',
    displayName: 'Europe / EU',
    kind: 'aggregation',
    // NO isoCode — this is an aggregation view, not a real single country
    camera: { lat: 50.8503, lng: 4.3517, distance: 5.2 },
    accessibilityLabel: 'European Union aggregate regional market intelligence view',
    prioritySectors: ['clean energy', 'regulatory', 'automotive', 'deeptech'],
    overviewDescription: 'Cross-border EU single market signals, Carbon Border Adjustment Mechanism (CBAM), and Net-Zero Industry Act targets.',
    hotspots: [
      { id: 'eu-bru', name: 'Brussels', lat: 50.8503, lng: 4.3517, sector: 'regulatory', description: 'EU policy directives & green taxonomy enforcement' },
      { id: 'eu-par', name: 'Paris', lat: 48.8566, lng: 2.3522, sector: 'deeptech', description: 'Open-source AI research & nuclear grid integration' },
      { id: 'eu-ams', name: 'Amsterdam', lat: 52.3676, lng: 4.9041, sector: 'logistics', description: 'European internet exchange & offshore wind power' },
      { id: 'eu-sto', name: 'Stockholm', lat: 59.3293, lng: 18.0686, sector: 'clean energy', description: 'Green steel plants & EV battery cell manufacturing' },
      { id: 'eu-mad', name: 'Madrid', lat: 40.4168, lng: -3.7038, sector: 'solar energy', description: 'Iberian green hydrogen & utility-scale solar arrays' },
      { id: 'eu-mil', name: 'Milan', lat: 45.4642, lng: 9.19, sector: 'manufacturing', description: 'Industrial automation & high-end specialized equipment' },
    ],
  },
  GLOBAL: {
    id: 'GLOBAL',
    displayName: 'Global Overview',
    kind: 'aggregation',
    camera: { lat: 25.0, lng: 10.0, distance: 5.8 },
    accessibilityLabel: 'Worldwide global market intelligence overview',
    prioritySectors: ['cross-border trade', 'supply chain', 'energy transition', 'ai infrastructure'],
    overviewDescription: 'Worldwide radar aggregating real-time GDELT news signals, cluster momentum, and high-viability business prospects across all continents.',
    // Global view has no fixed city anchors
  },
  ROW: {
    id: 'ROW',
    displayName: 'Rest of World',
    kind: 'aggregation',
    camera: { lat: 0.0, lng: 20.0, distance: 5.8 },
    accessibilityLabel: 'Rest of World emerging markets intelligence view',
    prioritySectors: ['emerging markets', 'minerals', 'agriculture', 'infrastructure'],
    overviewDescription: 'Dynamically surfaced signal hotspots across emerging growth regions, Latin America, Africa, Central & Southeast Asia.',
  },
};

export function getFocusMarket(id: string): FocusMarket | undefined {
  const normalized = (id || '').toUpperCase() as FocusMarketId;
  return FOCUS_MARKETS[normalized];
}

export function isAggregationMarket(id: string): boolean {
  const market = getFocusMarket(id);
  return market?.kind === 'aggregation';
}

export function getAllFocusMarkets(): FocusMarket[] {
  return Object.values(FOCUS_MARKETS);
}
