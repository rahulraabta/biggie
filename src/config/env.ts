import 'dotenv/config';
import { z } from 'zod';

/**
 * Infrastructure-only environment. Validated eagerly at import time so every
 * process (web app, workers, DB-only CLIs, migrations, cron jobs) fails fast
 * on missing infrastructure config.
 *
 * LLM credentials are deliberately NOT part of this schema: a DB-only tool
 * must not need OPENAI_API_KEY just to open the pool. LLM config is validated
 * lazily by getLlmEnv() when an LLM code path is actually taken.
 */
const infraSchema = z.object({
  DATABASE_URL: z.string().url(),
  PIPELINE_POLL_MS: z.coerce.number().default(3000),
  PIPELINE_TIMEOUT_MS: z.coerce.number().default(600000),
  PIPELINE_MAX_RETRIES: z.coerce.number().default(3),
  PIPELINE_MAX_PENDING_INGESTION: z.coerce.number().default(500),
  PIPELINE_MAX_PENDING_OPPORTUNITY: z.coerce.number().default(200),
  LLM_CACHE_ENABLED: z.coerce.boolean().default(true),
  LLM_RATE_LIMIT_PER_MIN: z.coerce.number().default(20),

  // Optional passthroughs consumed by src/services/**. Never required here.
  COHERE_API_KEY: z.string().optional(),
  LLM_API_KEY: z.string().optional(),
  // The gateway validates the URL on first request, not during module loading.
  LLM_BASE_URL: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  LLM_MAX_RETRIES: z.coerce.number().default(5),
  VOYAGE_API_KEY: z.string().optional(),
  VOYAGE_MIN_INTERVAL_MS: z.coerce.number().default(22000),
  PG_POOL_MAX: z.coerce.number().default(10),
});

const parsedInfra = infraSchema.safeParse(process.env);

if (!parsedInfra.success) {
  for (const issue of parsedInfra.error.issues) {
    console.error(`${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = Object.freeze(parsedInfra.data);
export type Env = typeof env;

/**
 * LLM-only environment, validated on first use.
 * Calling getLlmEnv() is the point at which a process opts into needing an
 * LLM provider; until then no AI credential is required.
 */
const llmSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_BASE_URL: z.string().url().optional(),
  GDELT_API_URL: z.string().url().optional(),
  LLM_MODEL: z.string().default('qwen/qwen3.8-max'),
});

export type LlmEnv = z.infer<typeof llmSchema>;

let _llmEnv: LlmEnv | null = null;

export function getLlmEnv(): LlmEnv {
  if (_llmEnv) return _llmEnv;
  const parsed = llmSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('\n Missing LLM configuration:\n');
    for (const i of parsed.error.issues) console.error(`   ${i.path.join('.')}: ${i.message}`);
    console.error('\nThis code path requires an LLM. Set OPENAI_API_KEY in .env.\n');
    process.exit(1);
  }
  _llmEnv = parsed.data;
  return _llmEnv;
}
