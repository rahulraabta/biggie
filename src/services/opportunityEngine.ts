import { StoryClusterRecord } from './clusteringService.js';
import { completeChat, parseLlmJsonResponse } from './llmGateway.js';
import { getPool } from '../db/index.js';

export type OpportunityType = 'business' | 'innovation' | 'investment';
export type OpportunityBand = 'red' | 'orange' | 'green';

export interface OpportunityRecord {
  id?: number;
  cluster_id: number;
  type: OpportunityType;
  title: string;
  short_description: string;
  long_description: string;
  feasibility_score: number;
  impact_score: number;
  time_to_market_score: number;
  probability_score: number;
  band: OpportunityBand;
  risks: string[];
  assumptions: string[];
  source_count: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface RawLlmOpportunity {
  type: OpportunityType;
  title: string;
  short_description: string;
  long_description: string;
  feasibility_score: number;
  impact_score: number;
  time_to_market_score: number;
  risks?: string[];
  assumptions?: string[];
}

export interface OpportunityGenerationResult {
  totalClustersProcessed: number;
  opportunitiesGenerated: number;
  opportunitiesByBand: Record<OpportunityBand, number>;
  opportunitiesByType: Record<OpportunityType, number>;
  opportunities: OpportunityRecord[];
}

/**
 * Calculates the consolidated probability score from feasibility, impact, and time-to-market scores.
 * Formula: (feasibility * 0.4) + (impact * 0.4) + (time_to_market * 0.2)
 */
export function calculateProbabilityScore(
  feasibility: number,
  impact: number,
  timeToMarket: number
): number {
  const clamp = (val: number) => Math.max(0, Math.min(100, val || 0));
  const f = clamp(feasibility);
  const imp = clamp(impact);
  const ttm = clamp(timeToMarket);

  const prob = f * 0.4 + imp * 0.4 + ttm * 0.2;
  return parseFloat(prob.toFixed(2));
}

/**
 * Maps a probability score (0-100) to a risk/viability color band.
 * - red: 0 to 40
 * - orange: 41 to 70
 * - green: 71 to 100
 */
export function mapProbabilityToBand(score: number): OpportunityBand {
  if (score <= 40.0) return 'red';
  if (score <= 70.0) return 'orange';
  return 'green';
}

/**
 * Constructs a structured system and user prompt for extracting opportunities from news event clusters.
 */
function buildOpportunityPrompt(cluster: StoryClusterRecord): Array<{ role: 'system' | 'user'; content: string }> {
  const articlesSummary = cluster.articles
    .map(
      (a, i) =>
        `Article ${i + 1}:
- URL: ${a.url}
- Country: ${a.country_code || 'Global'}
- Actors: ${[a.actor_1, a.actor_2].filter(Boolean).join(' vs ')}
- Sectors: ${(a.matched_sectors || []).join(', ')}
- Event Code: ${a.event_code || 'N/A'} (Goldstein: ${a.goldstein_scale}, Mentions: ${a.num_mentions}, Tone: ${a.avg_tone})`
    )
    .join('\n\n');

  const systemMessage = `You are a world-class lead market analyst & venture opportunity architect.
Your task is to analyze global news event clusters and generate 1 to 4 concrete, highly actionable opportunities.

Opportunity Types:
1. 'business': Commercial products/services, B2B solutions, export opportunities, or operational enhancements.
2. 'innovation': R&D breakthroughs, technology applications, or novel business model pivots.
3. 'investment': Early-stage/growth investments, infrastructure funding, M&A targets, or joint ventures.

Scoring Requirements (0 to 100 float scale for each):
- feasibility_score: Technical, regulatory, and resource execution ease.
- impact_score: Potential revenue, market size, or strategic value.
- time_to_market_score: Speed to realization (100 = fast/immediate < 6 months, 0 = long-term > 3 years).

Output Format: You MUST return a valid JSON object matching this schema:
{
  "opportunities": [
    {
      "type": "business" | "innovation" | "investment",
      "title": "Clear Actionable Title (max 255 chars)",
      "short_description": "1-2 sentence executive summary of the opportunity",
      "long_description": "Detailed strategic breakdown, market demand driver, and value proposition",
      "feasibility_score": 85.0,
      "impact_score": 90.0,
      "time_to_market_score": 75.0,
      "risks": ["Risk point 1", "Risk point 2"],
      "assumptions": ["Key assumption 1", "Key assumption 2"]
    }
  ]
}`;

  const userMessage = `Story Cluster Context:
- Cluster Title: ${cluster.title}
- Dominant Sector: ${cluster.dominant_sector}
- Primary Region: ${cluster.primary_region}
- Article Count: ${cluster.article_count}

Member News Events:
${articlesSummary}`;

  return [
    { role: 'system', content: systemMessage },
    { role: 'user', content: userMessage },
  ];
}

/**
 * Generates opportunities for a single story cluster using the LLM Gateway.
 */
export async function generateOpportunitiesForCluster(
  cluster: StoryClusterRecord
): Promise<OpportunityRecord[]> {
  const messages = buildOpportunityPrompt(cluster);
  const response = await completeChat({
    messages,
    temperature: 0.3,
    jsonMode: true,
  });

  const parsed = parseLlmJsonResponse<{ opportunities: RawLlmOpportunity[] }>(response.content);
  const rawList = parsed.opportunities || [];

  return rawList.map((raw) => {
    const probability_score = calculateProbabilityScore(
      raw.feasibility_score,
      raw.impact_score,
      raw.time_to_market_score
    );
    const band = mapProbabilityToBand(probability_score);

    // Validate type enum fallback
    let type: OpportunityType = 'business';
    if (raw.type === 'innovation' || raw.type === 'investment') {
      type = raw.type;
    }

    return {
      cluster_id: cluster.id || 0,
      type,
      title: raw.title.slice(0, 255),
      short_description: raw.short_description || '',
      long_description: raw.long_description || '',
      feasibility_score: Math.max(0, Math.min(100, raw.feasibility_score || 50)),
      impact_score: Math.max(0, Math.min(100, raw.impact_score || 50)),
      time_to_market_score: Math.max(0, Math.min(100, raw.time_to_market_score || 50)),
      probability_score,
      band,
      risks: Array.isArray(raw.risks) ? raw.risks : [],
      assumptions: Array.isArray(raw.assumptions) ? raw.assumptions : [],
      source_count: cluster.articles.length,
    };
  });
}

/**
 * Orchestrates opportunity generation across clusters and persists to PostgreSQL.
 */
export async function processClusterOpportunities(
  clusters: StoryClusterRecord[],
  options?: { dryRun?: boolean }
): Promise<OpportunityGenerationResult> {
  const isDryRun = options?.dryRun ?? false;
  const result: OpportunityGenerationResult = {
    totalClustersProcessed: clusters.length,
    opportunitiesGenerated: 0,
    opportunitiesByBand: { red: 0, orange: 0, green: 0 },
    opportunitiesByType: { business: 0, innovation: 0, investment: 0 },
    opportunities: [],
  };

  const pool = !isDryRun ? getPool() : null;

  for (const cluster of clusters) {
    try {
      const generatedList = await generateOpportunitiesForCluster(cluster);

      for (const opp of generatedList) {
        opp.cluster_id = cluster.id || 0;
        result.opportunities.push(opp);
        result.opportunitiesGenerated++;
        result.opportunitiesByBand[opp.band]++;
        result.opportunitiesByType[opp.type]++;

        if (!isDryRun && cluster.id && pool) {
          await pool.query(
            `INSERT INTO opportunities (
              cluster_id, type, title, short_description, long_description,
              feasibility_score, impact_score, time_to_market_score,
              probability_score, band, risks, assumptions, source_count
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);`,
            [
              cluster.id,
              opp.type,
              opp.title,
              opp.short_description,
              opp.long_description,
              opp.feasibility_score,
              opp.impact_score,
              opp.time_to_market_score,
              opp.probability_score,
              opp.band,
              JSON.stringify(opp.risks),
              JSON.stringify(opp.assumptions),
              opp.source_count,
            ]
          );
        }
      }
    } catch (err) {
      console.error(`[Opportunity Engine Error] Failed for cluster "${cluster.title}":`, err);
    }
  }

  return result;
}
