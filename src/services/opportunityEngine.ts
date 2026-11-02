import { StoryClusterRecord } from './clusteringService.js';
import { reasonAboutCluster, type ValidatedOpportunityOutput } from './opportunityReasoning.js';
export type { RawLlmOpportunity } from './opportunityReasoning.js';
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
  validated_output?: ValidatedOpportunityOutput & { probability_score: number; band: OpportunityBand };
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

/** Generates only evidence-backed, Critic-approved opportunities. */
export async function generateOpportunitiesForCluster(
  cluster: StoryClusterRecord
): Promise<OpportunityRecord[]> {
  const validated = await reasonAboutCluster(cluster);
  return validated.map((output) => {
    const raw = output.opportunity;
    const probability_score = calculateProbabilityScore(raw.feasibility_score, raw.impact_score, raw.time_to_market_score);
    const band = mapProbabilityToBand(probability_score);
    return {
      cluster_id: cluster.id || 0,
      type: raw.type,
      title: raw.title,
      short_description: raw.short_description,
      long_description: raw.long_description,
      historical_context: raw.historical_context || '',
      core_problem: raw.core_problem,
      business_solution_explained: raw.business_solution_explained || '',
      detailed_problem_breakdown: raw.detailed_problem_breakdown || '',
      case_example: raw.case_example || '',
      actionable_venture_model: raw.actionable_venture_model,
      specific_catalysts: raw.specific_catalysts,
      feasibility_score: raw.feasibility_score,
      impact_score: raw.impact_score,
      time_to_market_score: raw.time_to_market_score,
      probability_score,
      band,
      risks: raw.risks,
      assumptions: raw.assumptions,
      source_count: cluster.articles.length,
      validated_output: { ...output, probability_score, band },
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
    if (!isDryRun && (!cluster.id || !Number.isSafeInteger(cluster.id) || cluster.id < 1)) throw new Error('Persisted opportunities require a valid cluster id.');
    console.log(`[Opportunity Engine ${idx + 1}/${clusters.length}] Processing cluster "${cluster.title}" (${cluster.articles.length} signals)...`);
    let persistenceFailed = false;

    try {
      const generatedList = await generateOpportunitiesForCluster(cluster);
      // (cluster_id, inserted row id) pairs collected for the per-cluster embed step
      const insertedThisCluster: Array<{ id: number; opp: OpportunityRecord }> = [];

      for (const opp of generatedList) {
        if (opp.validated_output?.review.status !== 'APPROVED') throw new Error('Only Critic-approved opportunities may be persisted.');
        opp.cluster_id = cluster.id || 0;
        if (!isDryRun && cluster.id && pool) {
          const insertRes = await pool.query<{ id: number }>(
            `INSERT INTO opportunities (
              cluster_id, type, title, short_description, long_description,
              historical_context, core_problem, business_solution_explained,
              detailed_problem_breakdown, case_example, actionable_venture_model, specific_catalysts,
              feasibility_score, impact_score, time_to_market_score,
              probability_score, band, risks, assumptions, source_count, validated_output
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21::jsonb)
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
              JSON.stringify(opp.validated_output),
            ]
          ).catch((error) => { persistenceFailed = true; throw error; });
          insertedThisCluster.push({ id: insertRes.rows[0].id, opp });
        }
        result.opportunities.push(opp);
        result.opportunitiesGenerated++;
        result.opportunitiesByBand[opp.band]++;
        result.opportunitiesByType[opp.type]++;
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
      if (persistenceFailed) throw err;
    }

    if (!isDryRun && interRequestDelayMs > 0 && idx < clusters.length - 1) {
      await new Promise((r) => setTimeout(r, interRequestDelayMs));
    }
  }

  return result;
}
