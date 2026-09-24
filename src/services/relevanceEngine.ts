import { RelevanceConfig } from '../config/relevanceConfig.js';
import { normalizeCountryCode } from '../utils/geoUtils.js';

export interface GdeltEvent {
  globalEventId: string;
  date: string;
  actor1: string;
  actor2: string;
  eventCode: string;
  goldsteinScale: number;
  numMentions: number;
  avgTone: number;
  actionCountryCode: string;
  sourceUrl: string;
}

export interface RelevanceEvaluation {
  isRelevant: boolean;
  score: number;
  matchedSectors: string[];
  matchedKeywords: string[];
  breakdown: {
    cameoScore: number;
    keywordScore: number;
    prominenceScore: number;
    geoScore: number;
  };
}

/**
 * Economic & Business CAMEO event codes map.
 * CAMEO categories:
 * - 021-025: Economic policy statements / appeals
 * - 031-035: Economic & trade cooperation / agreements
 * - 071-074: Economic aid, investments, grants
 * - 081-084: Trade concessions / tariff reductions
 * - 101-105: Economic reform demands / regulatory changes
 * - 171-174: Economic sanctions, tariffs, trade restrictions
 */
const HIGH_RELEVANCE_CAMEO_PREFIXES = ['021', '023', '031', '033', '034', '071', '072', '073', '081', '083', '101', '103', '171', '172', '173'];
const MEDIUM_RELEVANCE_CAMEO_PREFIXES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];

/**
 * Calculates a CAMEO Event Code relevance score (0.0 to 1.0).
 */
function getCameoScore(eventCode: string): number {
  if (!eventCode) return 0.3;

  const code = eventCode.trim();
  for (const prefix of HIGH_RELEVANCE_CAMEO_PREFIXES) {
    if (code.startsWith(prefix)) return 1.0;
  }
  for (const prefix of MEDIUM_RELEVANCE_CAMEO_PREFIXES) {
    if (code.startsWith(prefix)) return 0.6;
  }
  return 0.3;
}

/**
 * Normalizes URL and text fields into searchable tokens.
 */
function extractTokens(event: GdeltEvent): string[] {
  const rawText = `${event.sourceUrl} ${event.actor1} ${event.actor2}`.toLowerCase();
  // Remove non-alphanumeric separators to isolate words/tokens
  return rawText.split(/[^a-z0-9]+/g).filter((t) => t.length > 2);
}

/**
 * Evaluates an incoming GDELT event deterministically against configured relevance thresholds and scoring weights.
 *
 * Weight Distribution:
 * - 30% CAMEO Event Code relevance (business/trade/policy focus)
 * - 35% Keyword & Sector match density in URL/actors
 * - 20% Prominence & mention volume (log-scaled)
 * - 15% Geographic priority boost (e.g. India, US, GB, etc.)
 */
export function evaluateEventRelevance(
  event: GdeltEvent,
  config: RelevanceConfig
): RelevanceEvaluation {
  // Hard Exclusions
  if (!event.sourceUrl || (!event.sourceUrl.startsWith('http://') && !event.sourceUrl.startsWith('https://'))) {
    return createNegativeEvaluation();
  }

  if (event.numMentions < config.minNumMentions) {
    return createNegativeEvaluation();
  }

  if (event.avgTone < config.minTone || event.avgTone > config.maxTone) {
    return createNegativeEvaluation();
  }

  if (event.goldsteinScale < config.minGoldsteinScale || event.goldsteinScale > config.maxGoldsteinScale) {
    return createNegativeEvaluation();
  }

  // 1. CAMEO Event Code Score (30%)
  const cameoScore = getCameoScore(event.eventCode);

  // 2. Keyword & Sector Match Score (35%)
  const tokens = extractTokens(event);
  const matchedSectorsSet = new Set<string>();
  const matchedKeywordsSet = new Set<string>();

  for (const token of tokens) {
    for (const sector of config.targetSectors) {
      if (token.includes(sector) || sector.includes(token)) {
        matchedSectorsSet.add(sector);
      }
    }
    for (const keyword of config.customKeywords) {
      if (token.includes(keyword) || keyword.includes(token)) {
        matchedKeywordsSet.add(keyword);
      }
    }
  }

  const matchedSectors = Array.from(matchedSectorsSet);
  const matchedKeywords = Array.from(matchedKeywordsSet);

  const totalMatches = matchedSectors.length + matchedKeywords.length;
  const keywordScore = Math.min(1.0, totalMatches * 0.35);

  // 3. Prominence Score (20%) - Log scale maxing out at ~32 mentions
  const prominenceScore = Math.min(1.0, Math.log2(1 + event.numMentions) / 5.0);

  // 4. Geographic Priority Score (15%)
  // GDELT emits FIPS 10-4 codes (CH=China, JA=Japan) — normalize to ISO before
  // comparing so 'cn' / 'jp' priority entries actually match.
  const country = normalizeCountryCode(event.actionCountryCode).toLowerCase();
  let geoScore = 0.4;
  if (country && country !== 'global' && config.priorityCountries.includes(country)) {
    geoScore = 1.0;
  } else if (!country || config.priorityCountries.includes('global')) {
    geoScore = 0.6;
  }

  // Weighted Deterministic Relevance Score
  const score = parseFloat(
    (0.30 * cameoScore + 0.35 * keywordScore + 0.20 * prominenceScore + 0.15 * geoScore).toFixed(3)
  );

  const isRelevant = score >= config.minRelevanceScore;

  return {
    isRelevant,
    score,
    matchedSectors,
    matchedKeywords,
    breakdown: {
      cameoScore,
      keywordScore,
      prominenceScore,
      geoScore,
    },
  };
}

function createNegativeEvaluation(): RelevanceEvaluation {
  return {
    isRelevant: false,
    score: 0,
    matchedSectors: [],
    matchedKeywords: [],
    breakdown: { cameoScore: 0, keywordScore: 0, prominenceScore: 0, geoScore: 0 },
  };
}
