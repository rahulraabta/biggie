import { completeChat, parseLlmJsonResponse } from './llmGateway';
import type { LlmCompletionResponse, LlmRequestOptions } from './llmGateway';
import { buildKey, getCached, hashPayload, setCached } from '@/src/pipeline/llmCache';
import type { LlmUsage } from '@/src/pipeline/llmCache';

export interface LlmCacheCallResult<T> {
  response: T;
  usage?: LlmUsage;
  model?: string;
}

export interface CallLlmWithCacheArgs<T> {
  /** Namespaces the cache key (e.g. 'opportunity'). */
  agentType: string;
  /** Everything that determines the LLM output; hashed into the cache key. */
  payload: unknown;
  /** Request forwarded to the gateway on a miss (ignored when `call` is set). */
  request?: LlmRequestOptions;
  /** Custom parser for the raw completion; defaults to JSON parsing. */
  parse?: (content: string, completion: LlmCompletionResponse) => T;
  /**
   * Performs the underlying LLM work on a cache miss. Defaults to the shared
   * gateway (completeChat); injected by tests and by callers that wrap an
   * existing LLM-backed service call.
   */
  call?: () => Promise<LlmCacheCallResult<T>>;
}

async function callGateway<T>(args: CallLlmWithCacheArgs<T>): Promise<LlmCacheCallResult<T>> {
  const completion = await completeChat(args.request ?? { messages: [] });
  const response = args.parse
    ? args.parse(completion.content, completion)
    : parseLlmJsonResponse<T>(completion.content);

  return {
    response,
    model: completion.model,
    usage: {
      promptTokens: completion.usage?.promptTokens,
      completionTokens: completion.usage?.completionTokens,
    },
  };
}

/**
 * LLM call with an idempotency-keyed response cache.
 *
 * A hit short-circuits before the gateway is touched; a miss performs the work
 * once and records the result so identical payloads replay from the cache.
 */
export async function callLlmWithCache<T>(
  args: CallLlmWithCacheArgs<T>
): Promise<{ response: T; cached: boolean; usage?: LlmUsage }> {
  const key = buildKey(args.agentType, args.payload);
  const shortKey = key.slice(0, 8);

  const hit = await getCached(key);
  if (hit) {
    console.log(`llm_cache=hit key=${shortKey}`);
    return {
      response: hit.response as T,
      cached: true,
      usage: { promptTokens: hit.promptTokens, completionTokens: hit.completionTokens },
    };
  }

  const result = args.call ? await args.call() : await callGateway<T>(args);

  await setCached(
    key,
    result.model ?? args.request?.model ?? 'unknown',
    hashPayload(args.request?.messages ?? args.payload),
    result.response,
    result.usage
  );
  console.log(`llm_cache=miss key=${shortKey}`);

  return { response: result.response, cached: false, usage: result.usage };
}
