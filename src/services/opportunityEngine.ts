import { StoryClusterRecord } from './clusteringService.js';
import { completeChat, parseLlmJsonResponse } from './llmGateway.js';
import { buildEmbeddingInput, embedDocuments } from './embeddingService.js';
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
  historical_context?: string;
  core_problem?: string;
  business_solution_explained?: string;
  detailed_problem_breakdown?: string;
  case_example?: string;
  actionable_venture_model?: string;
  specific_catalysts?: string[];
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
  historical_context?: string;
  core_problem?: string;
  business_solution_explained?: string;
  detailed_problem_breakdown?: string;
  case_example?: string;
  actionable_venture_model?: string;
  specific_catalysts?: string[];
  feasibility_score: number;
  impact_score: number;
  time_to_market_score: number;
  risks?: string[];
  assumptions?: string[];
}

export interface OpportunityGenerationResult {
  totalClustersProcessed: number;
  opportunitiesGenerated: number;
  opportunitiesEmbedded: number;
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
        `Article/Signal ${i + 1}:
- Title: ${a.title || 'Untitled Signal'}
- Stream Origin: ${a.source_type || (a.source === 'horizon' ? 'HORIZON' : 'GDELT')} (Platform: ${a.source_platform || a.source || 'GDELT'})
- URL: ${a.url}
- Country/Region: ${a.country_code || 'Global'}
- Actors: ${[a.actor_1, a.actor_2].filter(Boolean).join(' vs ') || 'N/A'}
- Sectors: ${(a.matched_sectors || []).join(', ')}
- Community Comments / Signals: ${JSON.stringify(a.community_comments || [])}
- Event Code/Tone: ${a.event_code || 'N/A'} (Goldstein: ${a.goldstein_scale}, Mentions: ${a.num_mentions}, Tone: ${a.avg_tone})`
    )
    .join('\n\n');

  const systemMessage = `You are the Antigravity Deep Venture Research Engine powered by Cohere.
Your mission is to perform rigorous technical and commercial synthesis on macro geopolitical signals, news events, and community telemetry.

STRICT WRITING RULES & FORBIDDEN PHRASES:
1. ABSOLUTELY BAN ALL GENERIC FILLER AND BUZZWORDS. Never output phrases like: "accelerating sector adoption", "structured venture positioning", "growing awareness", "regulatory shifts", "technological advancements", "robust demand", or "strategic alignment".
2. MANDATE DEEP TECHNICAL & COMMERCIAL SPECIFICITY: Mention concrete company names, specific manufacturing locations, named technologies (e.g. CoWoS packaging, SoIC, LFP battery chemistry, substrate supply limits, OSAT plants), named legislation, or exact financial metrics whenever relevant.

MANDATED ANALYTICAL SECTIONS:
1. Detailed Problem Teardown (detailed_problem_breakdown): A multi-paragraph (2-3 detailed paragraphs) technical/commercial teardown explaining the exact market bottleneck, engineering constraints, or supply chain friction behind the cluster.
2. Real-World Case Reference (case_example): A concrete, highly specific real-world analogy or industry case study referencing named companies, specific technologies, substrate constraints, or regional infrastructure parallels.
3. Actionable Venture Execution Model (actionable_venture_model): A step-by-step commercial solution explaining WHO pays (the target enterprise buyer), WHAT the exact product deliverable is, and HOW it is deployed and monetized.
4. Concrete Macro Catalysts (specific_catalysts): An array of 3-4 specific catalysts referencing named policy acts, price dynamics, CapEx grants, or technical milestones.
5. Historical Baseline Delta (historical_context): Compare current signals against 90-day baseline data to quantify the trend escalation.
6. Core Market Friction (core_problem): Concise summary of the root-cause problem.
7. Business Solution Summary (business_solution_explained): Executive summary of the business solution.

Output Format Requirement:
You MUST return a valid JSON object strictly matching this schema:
{
  "opportunities": [
    {
      "type": "business" | "innovation" | "investment",
      "title": "Clear Specific Executive Title (max 255 chars)",
      "short_description": "1-2 sentence executive summary",
      "long_description": "Detailed strategic breakdown and value proposition",
      "detailed_problem_breakdown": "Multi-paragraph (2-3 paragraphs) technical and commercial teardown of the exact market bottleneck, engineering constraints, or supply chain friction.",
      "case_example": "Concrete real-world case reference / field parallel naming specific companies, technologies, or infrastructure.",
      "actionable_venture_model": "Step-by-step commercial solution detailing the buyer, product deliverable, deployment model, and monetization.",
      "specific_catalysts": ["Specific catalyst 1 (named act/price/grant)", "Specific catalyst 2", "Specific catalyst 3"],
      "historical_context": "Historical baseline delta and signal trend analysis",
      "core_problem": "Root-cause market friction explanation",
      "business_solution_explained": "Translated commercial solution summary",
      "feasibility_score": 85.0,
      "impact_score": 90.0,
      "time_to_market_score": 75.0,
      "risks": ["Specific technical risk 1", "Specific market risk 2"],
      "assumptions": ["Key commercial assumption 1", "Key technical assumption 2"]
    }
  ]
}`;

  const userMessage = `Story Cluster Context:
- Cluster Title: ${cluster.title}
- Topic Label: ${cluster.topic_label}
- Dominant Sector: ${cluster.dominant_sector}
- Primary Region: ${cluster.primary_region}
- Article/Signal Count: ${cluster.article_count}
- Stream Type: ${cluster.source_type || 'HYBRID'}

Member Articles & Signals in this Cluster:
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
      historical_context: raw.historical_context || 'Signal analysis indicates an accelerating trend above historical 90-day baseline.',
      core_problem: raw.core_problem || raw.detailed_problem_breakdown?.slice(0, 300) || 'Regulatory and supply chain friction creates an operational gap in regional markets.',
      business_solution_explained: raw.business_solution_explained || raw.actionable_venture_model?.slice(0, 300) || 'Deploy modular asset-backed solutions tailored for enterprise commercial adoption.',
      detailed_problem_breakdown: raw.detailed_problem_breakdown || raw.core_problem || '',
      case_example: raw.case_example || '',
      actionable_venture_model: raw.actionable_venture_model || raw.business_solution_explained || '',
      specific_catalysts: Array.isArray(raw.specific_catalysts) ? raw.specific_catalysts : [],
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
  options?: { dryRun?: boolean; delayMs?: number }
): Promise<OpportunityGenerationResult> {
  const isDryRun = options?.dryRun ?? false;
  const interRequestDelayMs = options?.delayMs ?? (isDryRun ? 0 : 6500);

  const result: OpportunityGenerationResult = {
    totalClustersProcessed: clusters.length,
    opportunitiesGenerated: 0,
    opportunitiesEmbedded: 0,
    opportunitiesByBand: { red: 0, orange: 0, green: 0 },
    opportunitiesByType: { business: 0, innovation: 0, investment: 0 },
    opportunities: [],
  };

  const pool = !isDryRun ? getPool() : null;

  for (let idx = 0; idx < clusters.length; idx++) {
    const cluster = clusters[idx];
    console.log(`[Opportunity Engine ${idx + 1}/${clusters.length}] Processing cluster "${cluster.title}" (${cluster.articles.length} signals)...`);

    try {
      const generatedList = await generateOpportunitiesForCluster(cluster);
      // (cluster_id, inserted row id) pairs collected for the per-cluster embed step
      const insertedThisCluster: Array<{ id: number; opp: OpportunityRecord }> = [];

      for (const opp of generatedList) {
        opp.cluster_id = cluster.id || 0;
        result.opportunities.push(opp);
        result.opportunitiesGenerated++;
        result.opportunitiesByBand[opp.band]++;
        result.opportunitiesByType[opp.type]++;

        if (!isDryRun && cluster.id && pool) {
          const insertRes = await pool.query<{ id: number }>(
            `INSERT INTO opportunities (
              cluster_id, type, title, short_description, long_description,
              historical_context, core_problem, business_solution_explained,
              detailed_problem_breakdown, case_example, actionable_venture_model, specific_catalysts,
              feasibility_score, impact_score, time_to_market_score,
              probability_score, band, risks, assumptions, source_count
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING id;`,
            [
              cluster.id,
              opp.type,
              opp.title,
              opp.short_description,
              opp.long_description,
              opp.historical_context,
              opp.core_problem,
              opp.business_solution_explained,
              opp.detailed_problem_breakdown,
              opp.case_example,
              opp.actionable_venture_model,
              JSON.stringify(opp.specific_catalysts || []),
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
          insertedThisCluster.push({ id: insertRes.rows[0].id, opp });
        }
      }

      // Auto-embed: batch the cluster's new opportunities through Voyage AI and
      // write vectors immediately, so hybrid search is consistent at ingest time.
      // Soft-fail: inserts already landed; on any Voyage error the rows keep
      // embedding NULL and the generate-embeddings worker backfills them later.
      if (!isDryRun && insertedThisCluster.length > 0 && pool) {
        try {
          const payloads = insertedThisCluster.map(({ opp }) => ({
            title: opp.title,
            sector: cluster.dominant_sector,
            country_code: cluster.primary_region,
            short_description: opp.short_description,
            core_problem: opp.core_problem,
            catalysts: opp.specific_catalysts,
          }));
          const vectors = await embedDocuments(payloads.map(buildEmbeddingInput));
          for (let i = 0; i < insertedThisCluster.length; i++) {
            // JSON.stringify of number[] produces '[0.1,0.2,...]' — pgvector text format
            await pool.query(
              `UPDATE opportunities SET embedding = $1::vector WHERE id = $2;`,
              [JSON.stringify(vectors[i]), insertedThisCluster[i].id]
            );
            result.opportunitiesEmbedded++;
          }
        } catch (embedErr: any) {
          console.warn(
            `[Opportunity Engine] Embedding soft-failed for cluster "${cluster.title}" ` +
              `(${insertedThisCluster.length} rows left NULL for worker backfill):`,
            embedErr?.message || embedErr
          );
        }
      }
    } catch (err: any) {
      console.error(`[Opportunity Engine Error] Failed for cluster "${cluster.title}":`, err?.message || err);
    }

    if (!isDryRun && interRequestDelayMs > 0 && idx < clusters.length - 1) {
      await new Promise((r) => setTimeout(r, interRequestDelayMs));
    }
  }

  return result;
}
