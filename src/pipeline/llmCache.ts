import { createHash } from 'node:crypto';
import { query } from '@/src/db/index';
import { env } from '@/src/config/env';

export interface CachedLlmResponse {
  model: string;
  response: unknown;
  promptTokens?: number;
  completionTokens?: number;
}

export interface LlmUsage {
  promptTokens?: number;
  completionTokens?: number;
}

/**
 * Cache enablement is resolved at call time (not import time) so it reflects
 * the live process env, with the validated `env` value as the fallback.
 */
function isCacheEnabled(): boolean {
  const raw = process.env.LLM_CACHE_ENABLED;
  if (raw === undefined || raw === '') return env.LLM_CACHE_ENABLED;
  return raw !== 'false' && raw !== '0';
}

/** Recursively sorts object keys so equivalent payloads serialize identically. */
function normalize(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = normalize(source[key]);
    }
    return sorted;
  }
  return value;
}

export function canonicalize(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function hashPayload(payload: unknown): string {
  return createHash('sha256').update(canonicalize(payload)).digest('hex');
}

export function buildKey(agentType: string, payload: unknown): string {
  return createHash('sha256').update(`${agentType}:${hashPayload(payload)}`).digest('hex');
}

/** Returns the cached LLM response, or null on a miss / when caching is off. */
export async function getCached(key: string): Promise<CachedLlmResponse | null> {
  if (!isCacheEnabled()) return null;

  const res = await query<{
    model: string;
    response: unknown;
    prompt_tokens: number | null;
    completion_tokens: number | null;
  }>(
    `SELECT model, response, prompt_tokens, completion_tokens
     FROM llm_cache
     WHERE idempotency_key = $1`,
    [key]
  );

  const row = res.rows[0];
  if (!row) return null;

  return {
    model: row.model,
    response: row.response,
    promptTokens: row.prompt_tokens ?? undefined,
    completionTokens: row.completion_tokens ?? undefined,
  };
}

/** Writes a cache entry; first writer wins (existing keys are left untouched). */
export async function setCached(
  key: string,
  model: string,
  promptHash: string,
  response: unknown,
  usage?: LlmUsage
): Promise<void> {
  if (!isCacheEnabled()) return;

  await query(
    `INSERT INTO llm_cache
       (idempotency_key, model, prompt_hash, response, prompt_tokens, completion_tokens)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)
     ON CONFLICT (idempotency_key) DO NOTHING`,
    [
      key,
      model,
      promptHash,
      JSON.stringify(response ?? null),
      usage?.promptTokens ?? null,
      usage?.completionTokens ?? null,
    ]
  );
}
