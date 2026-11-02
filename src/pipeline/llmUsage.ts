import { query } from '@/src/db/index';

/**
 * USD per 1M tokens, by model id. `default` is a conservative fallback used for
 * models we do not have explicit pricing for.
 */
export const PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  'qwen/qwen3.8-max': { inputPer1M: 0.6, outputPer1M: 2.4 },
  'command-r-08-2024': { inputPer1M: 0.15, outputPer1M: 0.6 },
  'command-r-plus-08-2024': { inputPer1M: 2.5, outputPer1M: 10.0 },
  'embed-english-v3.0': { inputPer1M: 0.1, outputPer1M: 0.0 },
  default: { inputPer1M: 1.0, outputPer1M: 4.0 },
};

/** Cost in USD for a single call, rounded to 6 decimals (matches NUMERIC(12,6)). */
export function computeCostUsd(model: string, promptTokens: number, completionTokens: number): number {
  const rate = PRICING[model] ?? PRICING.default;
  const prompt = Number.isFinite(promptTokens) ? promptTokens : 0;
  const completion = Number.isFinite(completionTokens) ? completionTokens : 0;
  const cost = (prompt * rate.inputPer1M + completion * rate.outputPer1M) / 1_000_000;
  return Math.round(cost * 1e6) / 1e6;
}

export interface RecordUsageArgs {
  eventId?: number | null;
  agentType: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cached: boolean;
}

/**
 * Appends one row to llm_usage. Telemetry must never break a pipeline run, so
 * any failure (including a missing table on a fresh deploy) is logged and
 * swallowed.
 */
export async function recordUsage(args: RecordUsageArgs): Promise<void> {
  const promptTokens = Number.isFinite(args.promptTokens) ? args.promptTokens : 0;
  const completionTokens = Number.isFinite(args.completionTokens) ? args.completionTokens : 0;
  const costUsd = computeCostUsd(args.model, promptTokens, completionTokens);

  try {
    await query(
      `INSERT INTO llm_usage
         (event_id, agent_type, model, prompt_tokens, completion_tokens, cost_usd, cached)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        args.eventId ?? null,
        args.agentType,
        args.model,
        promptTokens,
        completionTokens,
        costUsd.toFixed(6),
        args.cached,
      ]
    );
  } catch (err) {
    console.error('[llmUsage] Failed to record LLM usage:', err);
  }
}
