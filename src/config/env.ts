import 'dotenv/config';
import { z } from 'zod';

const isTest = process.env.NODE_ENV === 'test';

const baseSchema = z.object({
  DATABASE_URL: z.string().url(),
  PIPELINE_POLL_MS: z.coerce.number().default(3000),
  PIPELINE_TIMEOUT_MS: z.coerce.number().default(600000),
  PIPELINE_MAX_RETRIES: z.coerce.number().default(3),
  LLM_CACHE_ENABLED: z.coerce.boolean().default(true),
  LLM_RATE_LIMIT_PER_MIN: z.coerce.number().default(20),

  // Provider settings consumed by src/services/**. Optional so importing
  // modules under test never hard-requires an LLM key.
  COHERE_API_KEY: z.string().optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_BASE_URL: z.string().url().optional(),
  LLM_MODEL: z.string().optional(),
  LLM_MAX_RETRIES: z.coerce.number().default(5),
  VOYAGE_API_KEY: z.string().optional(),
  VOYAGE_MIN_INTERVAL_MS: z.coerce.number().default(22000),
  PG_POOL_MAX: z.coerce.number().default(10),
});

const runtimeSchema = baseSchema.extend({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_BASE_URL: z.string().url().optional(),
  GDELT_API_URL: z.string().url().optional(),
  LLM_MODEL: z.string().default('qwen/qwen3.8-max'),
});

const schema = isTest ? baseSchema : runtimeSchema;

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  for (const issue of parsed.error.issues) {
    console.error(`${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
export type Env = typeof env;
