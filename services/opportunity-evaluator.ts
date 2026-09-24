import {
  APICallError,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output,
  RetryError,
  TypeValidationError,
  generateText,
} from 'ai';
import type { FinishReason, LanguageModel, LanguageModelUsage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

/**
 * Autonomous multi-pass opportunity evaluation engine.
 *
 * `evaluateOpportunity(rawText)` runs three sequential LLM passes over a raw
 * news/market text:
 *
 *   1. Extractor    - typed market signals, entities and revenue vectors.
 *   2. Critic       - risks, feasibility and required resources for pass 1.
 *   3. Synthesizer  - merges passes 1 and 2 into an `OpportunityScorecard`
 *                     carrying a 1-100 confidence score and strategic summary.
 *
 * Every LLM response is constrained AND re-validated with a strict Zod schema
 * (`z.strictObject`, so unknown keys fail), and each pass is wrapped in staged
 * retry/error handling that surfaces `OpportunityEvaluatorError` with the pass
 * that failed.
 */

/* -------------------------------------------------------------------------- */
/* Pass 1 - Extractor                                                          */
/* -------------------------------------------------------------------------- */

/** One observed market signal, backed by a verbatim quote from the source. */
export const MarketSignalSchema = z.strictObject({
  signal: z
    .string()
    .min(8)
    .max(280)
    .describe('Single sentence describing the market signal found in the source text.'),
  category: z.enum(['policy', 'technology', 'capital', 'demand', 'supply', 'competitive', 'macro']),
  strength: z
    .number()
    .int()
    .min(1)
    .max(10)
    .describe('How strong and well-evidenced the signal is, 1 (weak) to 10 (decisive).'),
  evidenceQuote: z
    .string()
    .min(8)
    .max(400)
    .describe('Verbatim substring copied from the source text that supports this signal.'),
});

/** A named actor, technology, commodity or jurisdiction in the source text. */
export const EntitySchema = z.strictObject({
  name: z.string().min(1).max(140),
  kind: z.enum(['company', 'government', 'investor', 'technology', 'commodity', 'region', 'person']),
  jurisdiction: z
    .string()
    .max(120)
    .nullable()
    .describe('ISO-3166 alpha-2 code or region name when the entity is geographically bound.'),
  role: z.string().min(4).max(280).describe('What this entity does in the story.'),
});

/** Revenue models the extractor and synthesizer may choose from. */
export const REVENUE_MODELS = [
  'subscription',
  'transactional',
  'licensing',
  'services',
  'hardware',
  'marketplace',
  'financing',
] as const;

/** A plausible way the opportunity could generate revenue. */
export const RevenueVectorSchema = z.strictObject({
  name: z.string().min(4).max(180),
  model: z.enum(REVENUE_MODELS),
  targetCustomer: z.string().min(4).max(180),
  estimatedAnnualValueUsd: z.number().min(0).max(1_000_000_000_000),
  timeToRevenueMonths: z.number().int().min(0).max(120),
  rationale: z.string().min(8).max(400),
});

/** Pass 1 output contract. */
export const ExtractorOutputSchema = z.strictObject({
  title: z.string().min(6).max(200).describe('Working title for the opportunity.'),
  sector: z.string().min(2).max(80),
  region: z.string().min(2).max(80).describe('Primary market, ISO-3166 alpha-2 code or "Global".'),
  summary: z.string().min(40).max(1_200).describe('Neutral, factual summary of the extracted material.'),
  marketSignals: z.array(MarketSignalSchema).min(1).max(12),
  entities: z.array(EntitySchema).min(1).max(20),
  revenueVectors: z.array(RevenueVectorSchema).min(1).max(8),
});

/* -------------------------------------------------------------------------- */
/* Pass 2 - Critic                                                             */
/* -------------------------------------------------------------------------- */

/** A single risk with an explicit mitigation path. */
export const RiskItemSchema = z.strictObject({
  risk: z.string().min(8).max(280),
  category: z.enum([
    'regulatory',
    'market',
    'execution',
    'financial',
    'technical',
    'reputational',
    'geopolitical',
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  likelihood: z.enum(['unlikely', 'possible', 'likely', 'almost-certain']),
  mitigation: z.string().min(8).max(320),
});

/** Feasibility scored per dimension; `capitalIntensity` is inverted (10 = capital heavy). */
export const FeasibilityDimensionsSchema = z.strictObject({
  technical: z.number().int().min(1).max(10),
  commercial: z.number().int().min(1).max(10),
  regulatory: z.number().int().min(1).max(10),
  capitalIntensity: z.number().int().min(1).max(10),
});

/** Something the venture must assemble before it can ship. */
export const RequiredResourceSchema = z.strictObject({
  resource: z.string().min(4).max(200),
  kind: z.enum(['capital', 'talent', 'technology', 'licence', 'partnership', 'infrastructure']),
  criticality: z.enum(['nice-to-have', 'important', 'critical']),
  estimatedCostUsd: z.number().min(0).max(1_000_000_000_000).nullable(),
  leadTimeWeeks: z.number().int().min(0).max(520).nullable(),
});

/** Pass 2 output contract. */
export const CriticOutputSchema = z.strictObject({
  verdict: z.enum(['proceed', 'proceed-with-conditions', 'hold', 'reject']),
  summary: z.string().min(40).max(1_400),
  risks: z.array(RiskItemSchema).min(1).max(12),
  feasibility: FeasibilityDimensionsSchema,
  requiredResources: z.array(RequiredResourceSchema).max(12),
  blockers: z.array(z.string().min(8).max(280)).max(8),
  confidenceAdjustment: z
    .number()
    .int()
    .min(-40)
    .max(40)
    .describe('Signed points to weigh into the synthesizer confidence score. Negative lowers it.'),
});

/* -------------------------------------------------------------------------- */
/* Pass 3 - Synthesizer                                                        */
/* -------------------------------------------------------------------------- */

/** Final scorecard risk row (critic risk, deduplicated and re-ranked). */
export const ScorecardRiskSchema = z.strictObject({
  risk: z.string().min(8).max(280),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  likelihood: z.enum(['unlikely', 'possible', 'likely', 'almost-certain']),
  mitigation: z.string().min(8).max(320),
});

/** Final scorecard revenue row. */
export const ScorecardRevenueVectorSchema = z.strictObject({
  name: z.string().min(4).max(180),
  model: z.enum(REVENUE_MODELS),
  targetCustomer: z.string().min(4).max(180),
  estimatedAnnualValueUsd: z.number().min(0).max(1_000_000_000_000),
  timeToRevenueMonths: z.number().int().min(0).max(120),
});

/** A single execution step with an owner and a horizon. */
export const NextStepSchema = z.strictObject({
  step: z.string().min(8).max(280),
  owner: z.string().min(2).max(120).describe('Accountable role, e.g. "Founder", "Regulatory lead".'),
  horizonDays: z.number().int().min(1).max(720),
});

/** Final merged artefact returned by the synthesizer pass. */
export const OpportunityScorecardSchema = z.strictObject({
  title: z.string().min(6).max(200),
  sector: z.string().min(2).max(80),
  region: z.string().min(2).max(80),
  strategicSummary: z
    .string()
    .min(60)
    .max(2_400)
    .describe('Executive summary merging the extracted signals with the critique.'),
  confidenceScore: z
    .number()
    .int()
    .min(1)
    .max(100)
    .describe('Overall confidence in the opportunity, 1 (speculative) to 100 (high conviction).'),
  recommendation: z.enum(['pursue-now', 'pursue-with-conditions', 'monitor', 'pass']),
  timeToFirstRevenueMonths: z.number().int().min(0).max(120),
  feasibility: FeasibilityDimensionsSchema,
  keySignals: z.array(MarketSignalSchema).min(1).max(12),
  revenueVectors: z.array(ScorecardRevenueVectorSchema).min(1).max(8),
  riskRegister: z.array(ScorecardRiskSchema).min(1).max(12),
  requiredResources: z.array(RequiredResourceSchema).max(12),
  criticalBlockers: z.array(z.string().min(8).max(280)).max(8),
  nextSteps: z.array(NextStepSchema).min(1).max(8),
});

export type MarketSignal = z.infer<typeof MarketSignalSchema>;
export type Entity = z.infer<typeof EntitySchema>;
export type RevenueVector = z.infer<typeof RevenueVectorSchema>;
export type ExtractorOutput = z.infer<typeof ExtractorOutputSchema>;
export type RiskItem = z.infer<typeof RiskItemSchema>;
export type FeasibilityDimensions = z.infer<typeof FeasibilityDimensionsSchema>;
export type RequiredResource = z.infer<typeof RequiredResourceSchema>;
export type CriticOutput = z.infer<typeof CriticOutputSchema>;
export type OpportunityScorecard = z.infer<typeof OpportunityScorecardSchema>;
/* -------------------------------------------------------------------------- */
/* Errors                                                                      */
/* -------------------------------------------------------------------------- */

/** Which part of the pipeline raised the failure. */
export type EvaluationStage = 'input' | 'configuration' | 'extractor' | 'critic' | 'synthesizer';

/** Stages that call the model. */
export type LlmStage = Exclude<EvaluationStage, 'input' | 'configuration'>;

export interface OpportunityEvaluatorErrorOptions {
  /** Whether re-running the stage could plausibly succeed. */
  readonly retryable?: boolean;
  /** Provider HTTP status, when the failure came from the API. */
  readonly statusCode?: number;
  readonly cause?: unknown;
}

/**
 * Every failure leaving this module is normalised into this error, so callers
 * can branch on `stage` (which pass failed) and `retryable` (worth re-queuing).
 */
export class OpportunityEvaluatorError extends Error {
  readonly stage: EvaluationStage;
  readonly retryable: boolean;
  readonly statusCode?: number;

  constructor(
    stage: EvaluationStage,
    message: string,
    options: OpportunityEvaluatorErrorOptions = {}
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'OpportunityEvaluatorError';
    this.stage = stage;
    this.retryable = options.retryable ?? false;
    if (options.statusCode !== undefined) this.statusCode = options.statusCode;
  }
}

function isAbortLike(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

/** Maps any thrown value into a staged `OpportunityEvaluatorError`. */
export function toEvaluatorError(error: unknown, stage: EvaluationStage): OpportunityEvaluatorError {
  if (error instanceof OpportunityEvaluatorError) return error;

  if (isAbortLike(error)) {
    return new OpportunityEvaluatorError(stage, `The ${stage} pass was aborted or timed out.`, {
      retryable: false,
      cause: error,
    });
  }

  if (NoObjectGeneratedError.isInstance(error)) {
    const reason = error.cause instanceof Error ? error.cause.message : 'output did not match the schema';
    return new OpportunityEvaluatorError(
      stage,
      `The ${stage} pass returned unusable structured output: ${reason}`,
      { retryable: true, cause: error }
    );
  }

  if (NoOutputGeneratedError.isInstance(error)) {
    return new OpportunityEvaluatorError(stage, `The ${stage} pass produced no output.`, {
      retryable: true,
      cause: error,
    });
  }

  if (APICallError.isInstance(error)) {
    const status = error.statusCode;
    return new OpportunityEvaluatorError(
      stage,
      `Provider call for the ${stage} pass failed${status === undefined ? '' : ` (HTTP ${status})`}: ${error.message}`,
      { retryable: error.isRetryable, statusCode: status, cause: error }
    );
  }

  if (RetryError.isInstance(error)) {
    const lastError = error.lastError instanceof Error ? `: ${error.lastError.message}` : '';
    return new OpportunityEvaluatorError(
      stage,
      `Provider retries for the ${stage} pass were exhausted (${error.reason})${lastError}`,
      { retryable: true, cause: error }
    );
  }

  if (TypeValidationError.isInstance(error)) {
    return new OpportunityEvaluatorError(
      stage,
      `The ${stage} pass failed type validation: ${error.message}`,
      { retryable: true, cause: error }
    );
  }

  const message = error instanceof Error ? error.message : String(error);
  return new OpportunityEvaluatorError(stage, `The ${stage} pass failed: ${message}`, {
    cause: error,
  });
}

/* -------------------------------------------------------------------------- */
/* Model resolution                                                            */
/* -------------------------------------------------------------------------- */

let cachedProvider: ReturnType<typeof createOpenAI> | null = null;

/** Model id used when the caller does not supply one. Mirrors llmGateway's convention. */
export function resolveEvaluatorModelId(): string {
  return (process.env.LLM_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();
}

function readApiKey(): string {
  const apiKey = (process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    throw new OpportunityEvaluatorError(
      'configuration',
      'No LLM API key found: set LLM_API_KEY or OPENAI_API_KEY in .env.local.'
    );
  }
  return apiKey;
}

/**
 * OpenAI-compatible provider built from the same env vars the rest of the app
 * uses (`LLM_API_KEY` / `LLM_BASE_URL`), so the evaluator can point at Groq,
 * Cohere's compatibility endpoint or OpenAI without code changes.
 */
function getProvider(): ReturnType<typeof createOpenAI> {
  if (!cachedProvider) {
    cachedProvider = createOpenAI({
      apiKey: readApiKey(),
      baseURL: (process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL || '').trim() || undefined,
    });
  }
  return cachedProvider;
}

/**
 * Chat-completions model, not the Responses API: every OpenAI-compatible
 * endpoint this app targets (Groq, Cohere) speaks `/chat/completions`.
 */
export function getEvaluatorModel(modelId: string = resolveEvaluatorModelId()): LanguageModel {
  return getProvider().chat(modelId);
}

/* -------------------------------------------------------------------------- */
/* Retry + abort plumbing                                                      */
/* -------------------------------------------------------------------------- */

/** Per-pass abort scope: caller cancellation plus a hard per-pass timeout. */
function createAbortScope(timeoutMs: number | undefined, signal: AbortSignal | undefined) {
  const controller = new AbortController();
  const onAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  const timer =
    timeoutMs && timeoutMs > 0
      ? setTimeout(() => controller.abort(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs)
      : undefined;

  return {
    signal: controller.signal,
    dispose: () => {
      if (timer) clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    },
  };
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new OpportunityEvaluatorError('input', 'Evaluation aborted before completion.'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new OpportunityEvaluatorError('input', 'Evaluation aborted before completion.'));
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

interface RetryOptions {
  readonly stage: EvaluationStage;
  readonly maxAttempts: number;
  readonly baseDelayMs?: number;
  readonly signal?: AbortSignal;
}

/** Retries only failures flagged retryable, with exponential backoff and jitter. */
async function withStageRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const baseDelayMs = options.baseDelayMs ?? 750;
  let lastError: OpportunityEvaluatorError | null = null;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    if (options.signal?.aborted) {
      throw new OpportunityEvaluatorError(options.stage, 'Evaluation aborted before completion.');
    }
    try {
      return await operation(attempt);
    } catch (error) {
      const evaluated = toEvaluatorError(error, options.stage);
      lastError = evaluated;
      if (!evaluated.retryable || attempt === options.maxAttempts) throw evaluated;

      const backoff = baseDelayMs * 2 ** (attempt - 1);
      const jitter = Math.floor(Math.random() * (baseDelayMs / 2 + 1));
      console.warn(
        `[Opportunity Evaluator] ${options.stage} pass attempt ${attempt}/${options.maxAttempts} failed: ${evaluated.message}. Retrying in ${backoff + jitter}ms...`
      );
      await sleep(backoff + jitter, options.signal);
    }
  }

  throw (
    lastError ??
    new OpportunityEvaluatorError(options.stage, `The ${options.stage} pass failed.`, {
      retryable: true,
    })
  );
}

/* -------------------------------------------------------------------------- */
/* Structured pass runner                                                      */
/* -------------------------------------------------------------------------- */

export interface PassUsage {
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly totalTokens: number | null;
}

export interface PassMetadata {
  readonly stage: LlmStage;
  readonly modelId: string;
  readonly attempts: number;
  readonly durationMs: number;
  readonly finishReason: FinishReason;
  readonly usage: PassUsage;
}

interface RunStructuredPassParams<SCHEMA extends z.ZodType> {
  readonly stage: LlmStage;
  readonly schema: SCHEMA;
  readonly system: string;
  readonly prompt: string;
  readonly temperature: number;
  readonly maxOutputTokens: number;
  readonly model: LanguageModel;
  readonly modelId: string;
  readonly maxAttempts: number;
  readonly baseDelayMs?: number;
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
}

function toUsage(usage: LanguageModelUsage | undefined): PassUsage {
  return {
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
    totalTokens: usage?.totalTokens ?? null,
  };
}

/**
 * Runs one model call under `output: Output.object({ schema })` and then
 * re-validates the result locally with the same Zod schema. The schema is the
 * single source of truth for both the provider contract and our own gate, so a
 * provider that ignores the JSON schema still cannot emit a malformed object.
 */
async function runStructuredPass<SCHEMA extends z.ZodType>(
  params: RunStructuredPassParams<SCHEMA>
): Promise<{ object: z.infer<SCHEMA>; metadata: PassMetadata; raw: string }> {
  const startedAt = Date.now();
  let attempts = 0;

  const result = await withStageRetry(
    async (attempt) => {
      attempts = attempt;
      const { signal, dispose } = createAbortScope(params.timeoutMs, params.signal);
      try {
        return await generateText({
          model: params.model,
          output: Output.object({ schema: params.schema }),
          system: params.system,
          prompt: params.prompt,
          temperature: params.temperature,
          maxOutputTokens: params.maxOutputTokens,
          // Stage-level retries live in `withStageRetry`; keep the SDK from
          // stacking its own retry loop on top of them.
          maxRetries: 0,
          abortSignal: signal,
        });
      } finally {
        dispose();
      }
    },
    {
      stage: params.stage,
      maxAttempts: params.maxAttempts,
      baseDelayMs: params.baseDelayMs,
      signal: params.signal,
    }
  );

  // `output` is a getter on the result: reading it throws NoOutputGeneratedError
  // when the final step produced nothing, which toEvaluatorError maps below.
  const raw: unknown = result.output;
  const parsed = params.schema.safeParse(raw);
  if (!parsed.success) {
    throw new OpportunityEvaluatorError(
      params.stage,
      `The ${params.stage} pass output failed Zod validation: ${parsed.error.issues
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .slice(0, 4)
        .join('; ')}`,
      { retryable: true, cause: parsed.error }
    );
  }

  return {
    object: parsed.data as z.infer<SCHEMA>,
    raw: JSON.stringify(raw),
    metadata: {
      stage: params.stage,
      modelId: params.modelId,
      attempts,
      durationMs: Date.now() - startedAt,
      finishReason: result.finishReason,
      usage: toUsage(result.usage),
    },
  };
}
/* -------------------------------------------------------------------------- */
/* Deterministic helpers                                                       */
/* -------------------------------------------------------------------------- */

/** Shortest raw text worth three LLM passes. */
export const MIN_RAW_TEXT_CHARS = 120;
/** Upper bound that keeps pass 1 inside a single context window. */
export const MAX_RAW_TEXT_CHARS = 60_000;

/** Collapses whitespace so prompts and grounding checks see one canonical text. */
export function normalizeRawText(rawText: string): string {
  if (typeof rawText !== 'string') {
    throw new OpportunityEvaluatorError('input', 'rawText must be a string.');
  }
  const normalized = rawText.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').trim();

  if (normalized.length < MIN_RAW_TEXT_CHARS) {
    throw new OpportunityEvaluatorError(
      'input',
      `rawText is too short to evaluate: ${normalized.length} characters (minimum ${MIN_RAW_TEXT_CHARS}).`
    );
  }
  if (normalized.length > MAX_RAW_TEXT_CHARS) {
    throw new OpportunityEvaluatorError(
      'input',
      `rawText is too long to evaluate: ${normalized.length} characters (maximum ${MAX_RAW_TEXT_CHARS}).`
    );
  }
  return normalized;
}

/** Case- and whitespace-insensitive form used for verbatim quote matching. */
export function normalizeForMatch(value: string): string {
  return value.replace(/[\s\u2018\u2019\u201c\u201d]+/g, ' ').trim().toLowerCase();
}

export interface GroundingReport {
  /** Signals that carried a quote. */
  readonly checkedQuotes: number;
  /** Quotes found verbatim in the source text. */
  readonly matchedQuotes: number;
  /** Signals whose quote could not be located in the source text. */
  readonly unmatchedSignals: readonly string[];
  /** matchedQuotes / checkedQuotes, 0 when nothing was checked. */
  readonly coverage: number;
}

/**
 * Deterministic hallucination check on pass 1: every `evidenceQuote` must
 * appear in the source text.
 *
 * Deliberately not an LLM pass - it is pure string work, so it is composed with
 * the pass 2 network call in a `Promise.all` and costs no extra wall-clock time.
 */
export async function verifyExtractionGrounding(
  extraction: ExtractorOutput,
  rawText: string
): Promise<GroundingReport> {
  const haystack = normalizeForMatch(rawText);
  const unmatchedSignals: string[] = [];
  let checkedQuotes = 0;
  let matchedQuotes = 0;

  for (const signal of extraction.marketSignals) {
    const needle = normalizeForMatch(signal.evidenceQuote);
    if (!needle) {
      unmatchedSignals.push(signal.signal);
      continue;
    }
    checkedQuotes += 1;
    if (haystack.includes(needle)) matchedQuotes += 1;
    else unmatchedSignals.push(signal.signal);
  }

  return {
    checkedQuotes,
    matchedQuotes,
    unmatchedSignals,
    coverage: checkedQuotes === 0 ? 0 : matchedQuotes / checkedQuotes,
  };
}

/**
 * Runs `worker` over `items` with at most `limit` in flight, preserving input
 * order in the result. Rejects with the first worker error.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new OpportunityEvaluatorError('input', `Concurrency limit must be >= 1 (received ${limit}).`);
  }
  if (items.length === 0) return [];

  const results = new Array<R>(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}

/* -------------------------------------------------------------------------- */
/* Prompts                                                                     */
/* -------------------------------------------------------------------------- */

const EXTRACTOR_SYSTEM = `You are the Extractor stage of an opportunity-intelligence pipeline.
Read the supplied market text and extract only what is present or directly implied by it.
Rules:
- Never invent facts, numbers, companies or jurisdictions that the text does not support.
- Every market signal must quote the source verbatim in evidenceQuote.
- Revenue vectors must be concrete enough to be testable, not aspirational slogans.
Return data matching the provided JSON schema exactly.`;

const CRITIC_SYSTEM = `You are the Critic stage of an opportunity-intelligence pipeline.
You receive a structured extraction and must stress-test it.
Rules:
- Judge only the extraction you are given; do not add new market facts.
- Score each feasibility dimension independently, 1 (very poor) to 10 (excellent).
- capitalIntensity is inverted: 10 means extremely capital heavy.
- Give every risk a realistic severity, likelihood and concrete mitigation.
- confidenceAdjustment is advisory input for the synthesis stage.`;

const SYNTHESIZER_SYSTEM = `You are the Synthesizer stage of an opportunity-intelligence pipeline.
Merge the extraction and the critique into one decision-ready scorecard.
Rules:
- Reconcile conflicts in favour of the critique, which is the adversarial view.
- Discount signals whose evidence quote failed the grounding check when weighting confidence.
- confidenceScore is calibrated conviction, 1 (speculative) to 100 (high conviction), not optimism.
- The strategic summary must state the thesis, the strongest evidence and the binding constraint.
Return data matching the provided JSON schema exactly.`;

/* -------------------------------------------------------------------------- */
/* Passes                                                                      */
/* -------------------------------------------------------------------------- */

interface PassContext {
  readonly model: LanguageModel;
  readonly modelId: string;
  readonly maxAttempts: number;
  readonly baseDelayMs?: number;
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
}

/** Pass 1: extract typed signals, entities and revenue vectors. */
export async function runExtractorPass(
  rawText: string,
  context: PassContext
): Promise<{ output: ExtractorOutput; metadata: PassMetadata }> {
  const { object, metadata } = await runStructuredPass({
    stage: 'extractor',
    schema: ExtractorOutputSchema,
    system: EXTRACTOR_SYSTEM,
    prompt: `Source text:\n"""\n${rawText}\n"""`,
    temperature: 0.1,
    maxOutputTokens: 2_500,
    ...context,
  });
  return { output: object, metadata };
}

/** Pass 2: adversarial critique of pass 1. */
export async function runCriticPass(
  extraction: ExtractorOutput,
  context: PassContext
): Promise<{ output: CriticOutput; metadata: PassMetadata }> {
  const { object, metadata } = await runStructuredPass({
    stage: 'critic',
    schema: CriticOutputSchema,
    system: CRITIC_SYSTEM,
    prompt: `Extraction to critique:\n${JSON.stringify(extraction, null, 2)}`,
    temperature: 0.2,
    maxOutputTokens: 2_500,
    ...context,
  });
  return { output: object, metadata };
}

/** Pass 3: merge passes 1 and 2 into the final scorecard. */
export async function runSynthesizerPass(
  extraction: ExtractorOutput,
  critique: CriticOutput,
  grounding: GroundingReport,
  context: PassContext
): Promise<{ output: OpportunityScorecard; metadata: PassMetadata }> {
  const groundingBlock = [
    `Quotes checked: ${grounding.checkedQuotes}`,
    `Quotes verified verbatim: ${grounding.matchedQuotes}`,
    `Coverage: ${(grounding.coverage * 100).toFixed(1)}%`,
    grounding.unmatchedSignals.length > 0
      ? `Unverified signals (discount these): ${grounding.unmatchedSignals.join(' | ')}`
      : 'Unverified signals: none',
  ].join('\n');

  const { object, metadata } = await runStructuredPass({
    stage: 'synthesizer',
    schema: OpportunityScorecardSchema,
    system: SYNTHESIZER_SYSTEM,
    prompt: [
      `Extraction:\n${JSON.stringify(extraction, null, 2)}`,
      `Critique:\n${JSON.stringify(critique, null, 2)}`,
      `Grounding check:\n${groundingBlock}`,
    ].join('\n\n'),
    temperature: 0.3,
    maxOutputTokens: 3_000,
    ...context,
  });
  return { output: object, metadata };
}
/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

export interface EvaluateOpportunityOptions {
  /** Pre-built model; defaults to the env-configured OpenAI-compatible chat model. */
  readonly model?: LanguageModel;
  /** Model id recorded in metadata when `model` is injected. */
  readonly modelId?: string;
  /** Cooperative cancellation. Also honoured between passes and during backoff. */
  readonly signal?: AbortSignal;
  /** Attempts per pass, including the first. Default 3. */
  readonly maxAttemptsPerPass?: number;
  /** Hard timeout per pass. Default 90s. */
  readonly timeoutMsPerPass?: number;
  /** Base backoff between pass attempts. Default 750ms. */
  readonly baseDelayMs?: number;
  /** Clock injection for deterministic tests. */
  readonly now?: () => Date;
}

export interface EvaluationMetadata {
  readonly modelId: string;
  /** ISO-8601 start time of the run. */
  readonly startedAt: string;
  readonly durationMs: number;
  /** Per-pass timing, model and token accounting, in execution order. */
  readonly passes: readonly PassMetadata[];
  /** Summed token usage of all passes, excluding retries that never returned usage. */
  readonly totalUsage: PassUsage;
  /** Advisory adjustment the critic passed to the synthesizer. */
  readonly confidenceAdjustment: number;
  readonly inputCharacters: number;
}

export interface OpportunityEvaluation {
  /** Pass 3 output - the decision-ready artefact. */
  readonly scorecard: OpportunityScorecard;
  /** Pass 1 output, kept for auditing the scorecard's provenance. */
  readonly extraction: ExtractorOutput;
  /** Pass 2 output, kept for auditing the scorecard's provenance. */
  readonly critique: CriticOutput;
  /** Deterministic grounding check run against the source text. */
  readonly grounding: GroundingReport;
  readonly metadata: EvaluationMetadata;
}

function sumUsage(passes: readonly PassMetadata[]): PassUsage {
  const total = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  for (const pass of passes) {
    total.inputTokens += pass.usage.inputTokens ?? 0;
    total.outputTokens += pass.usage.outputTokens ?? 0;
    total.totalTokens += pass.usage.totalTokens ?? 0;
  }
  return total;
}

/**
 * Runs the three-pass evaluation: extractor, then critic, then synthesizer.
 *
 * The LLM passes are strictly sequential because each consumes the previous
 * output. Everything that does *not* depend on the critic - the deterministic
 * quote-grounding check - runs concurrently with the pass 2 network call.
 *
 * @throws {OpportunityEvaluatorError} with the failing `stage` when any pass or
 * the input guard fails; check `error.retryable` before re-queuing.
 */
export async function evaluateOpportunity(
  rawText: string,
  options: EvaluateOpportunityOptions = {}
): Promise<OpportunityEvaluation> {
  const now = options.now ?? (() => new Date());
  const startedAt = now();
  const startedAtMs = Date.now();

  // Cheapest check first, so bad input fails the same way regardless of env.
  const normalized = normalizeRawText(rawText);
  const modelId = options.modelId ?? resolveEvaluatorModelId();
  // Fail fast on missing configuration before any pass spends a request.
  const model = options.model ?? getEvaluatorModel(modelId);

  const context: PassContext = {
    model,
    modelId,
    maxAttempts: Math.max(1, options.maxAttemptsPerPass ?? 3),
    baseDelayMs: options.baseDelayMs,
    timeoutMs: options.timeoutMsPerPass ?? 90_000,
    signal: options.signal,
  };

  // Tracks the in-flight pass so an unexpected throw can still be attributed.
  let activeStage: LlmStage = 'extractor';

  try {
    // Pass 1 - extractor.
    const extraction = await runExtractorPass(normalized, context);

    // Pass 2 - critic, concurrent with the deterministic grounding check on
    // pass 1's quotes. Both depend only on `extraction.output`.
    activeStage = 'critic';
    const [critique, grounding] = await Promise.all([
      runCriticPass(extraction.output, context),
      verifyExtractionGrounding(extraction.output, normalized),
    ]);

    // Pass 3 - synthesizer, merging all prior artefacts.
    activeStage = 'synthesizer';
    const scorecard = await runSynthesizerPass(
      extraction.output,
      critique.output,
      grounding,
      context
    );

    const passes = [extraction.metadata, critique.metadata, scorecard.metadata];

    return {
      scorecard: scorecard.output,
      extraction: extraction.output,
      critique: critique.output,
      grounding,
      metadata: {
        modelId,
        startedAt: startedAt.toISOString(),
        durationMs: Date.now() - startedAtMs,
        passes,
        totalUsage: sumUsage(passes),
        confidenceAdjustment: critique.output.confidenceAdjustment,
        inputCharacters: normalized.length,
      },
    };
  } catch (error) {
    throw error instanceof OpportunityEvaluatorError
      ? error
      : toEvaluatorError(error, activeStage);
  }
}

/**
 * Non-throwing wrapper for callers that prefer a result union (batch jobs,
 * queue workers) over exceptions.
 */
export async function tryEvaluateOpportunity(
  rawText: string,
  options: EvaluateOpportunityOptions = {}
): Promise<
  { ok: true; evaluation: OpportunityEvaluation } | { ok: false; error: OpportunityEvaluatorError }
> {
  try {
    return { ok: true, evaluation: await evaluateOpportunity(rawText, options) };
  } catch (error) {
    const staged = toEvaluatorError(error, 'input');
    console.error(
      `[Opportunity Evaluator] ${staged.stage} stage failed (retryable=${staged.retryable}): ${staged.message}`
    );
    return { ok: false, error: staged };
  }
}

export interface EvaluateOpportunitiesOptions extends EvaluateOpportunityOptions {
  /** Documents evaluated in parallel. Default 3. */
  readonly concurrency?: number;
}

/**
 * Evaluates independent documents concurrently with a bounded pool; results keep
 * input order. Each document still runs its own three sequential passes.
 */
export async function evaluateOpportunities(
  rawTexts: readonly string[],
  options: EvaluateOpportunitiesOptions = {}
): Promise<OpportunityEvaluation[]> {
  const { concurrency = 3, ...perDocument } = options;
  return mapWithConcurrency(rawTexts, concurrency, (rawText) =>
    evaluateOpportunity(rawText, perDocument)
  );
}