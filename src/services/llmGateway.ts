import { env } from '@/src/config/env';

export const DEFAULT_LLM_BASE_URL = 'https://agentrouter.org/v1';

export interface LlmRequestOptions {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  localProxyOnly?: boolean;
}

export interface LlmCompletionResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Interface representing standard LLM provider settings.
 */
export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  maxRetries: number;
}

/**
 * Reads LLM provider settings from environment variables with sensible defaults.
 * Defaults to AgentRouter. Explicit base URLs
 * override the default; Cohere is selected only by an explicit Cohere URL.
 */
export function getLlmConfig(): LlmConfig {
  const cohereKey = (process.env.COHERE_API_KEY || '').trim();
  const genericKey = (process.env.LLM_API_KEY || '').trim();
  const baseUrl = process.env.LLM_BASE_URL?.trim() || process.env.OPENAI_BASE_URL?.trim() || DEFAULT_LLM_BASE_URL;
  const hostname = new URL(baseUrl).hostname;
  const isCohere = hostname === 'api.cohere.com';
  return {
    baseUrl,
    apiKey: (isCohere ? cohereKey || genericKey : genericKey || (process.env.OPENAI_API_KEY || '').trim()) || 'dummy-key',
    model: env.LLM_MODEL || (isCohere ? 'command-r-08-2024' : 'qwen/qwen3.8-max'),
    maxRetries: env.LLM_MAX_RETRIES,
  };
}

export class LlmNonRetryableError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'LlmNonRetryableError';
  }
}

/** Opportunity reasoning must stay on the configured local proxy. */
function assertLocalLlmConfig(config: LlmConfig): void {
  const url = new URL(config.baseUrl);
  if (!['http:', 'https:'].includes(url.protocol) ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
      !['8318', '8317'].includes(url.port) || url.username || url.password) {
    throw new LlmNonRetryableError('Opportunity reasoning requires LLM_BASE_URL (or OPENAI_BASE_URL) on localhost port 8318 or 8317.', 400);
  }
}

/**
 * Retries an async LLM request with exponential backoff on HTTP rate limits or temporary errors.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5, initialDelayMs = 2000): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err: any) {
      if (err instanceof LlmNonRetryableError) {
        throw err;
      }
      attempt++;
      if (attempt >= maxRetries) throw err;

      // Special handling for HTTP 429 Rate Limits
      const isRateLimit = err?.status === 429 || (err?.message && err.message.includes('429'));
      const delay = isRateLimit
        ? Math.max(12000, initialDelayMs * Math.pow(2, attempt))
        : initialDelayMs * Math.pow(2, attempt - 1);

      console.warn(`[LLM Gateway Retry] Attempt ${attempt}/${maxRetries} failed: ${err.message}. Retrying in ${(delay / 1000).toFixed(1)}s...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw new Error('LLM Gateway retry limit reached');
}

/**
 * Sends a chat completion request to Cohere API v2 or any OpenAI-compatible endpoint.
 */
export async function completeChat(options: LlmRequestOptions, customConfig?: Partial<LlmConfig>): Promise<LlmCompletionResponse> {
  const config = { ...getLlmConfig(), ...customConfig };
  if (options.localProxyOnly) assertLocalLlmConfig(config);
  const model = options.model || config.model;

  const isLocalEndpoint = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(config.baseUrl).hostname);
  if (!config.apiKey && !isLocalEndpoint) {
    throw new LlmNonRetryableError(
      'Set LLM_API_KEY or OPENAI_API_KEY for the configured remote endpoint (COHERE_API_KEY for Cohere).',
      401
    );
  }

  const isCohere = new URL(config.baseUrl).hostname === 'api.cohere.com';

  if (isCohere) {
    const { CohereClientV2, CohereError } = await import('cohere-ai');
    const client = new CohereClientV2({
      token: process.env.COHERE_API_KEY?.trim() || config.apiKey,
      baseUrl: new URL(config.baseUrl).origin,
      maxRetries: 0,
    });

    return withRetry(async () => {
      try {
        const data = await client.chat({
          model, messages: options.messages, temperature: options.temperature ?? 0.3,
          maxTokens: options.maxTokens,
          responseFormat: options.jsonMode ? { type: 'json_object' } : undefined,
        });
        const tokens = data.usage?.tokens;
        return {
          content: (data.message?.content || []).map((item) => item.type === 'text' ? item.text : '').join(''),
          model: data.id ? `cohere-${model}` : model,
          usage: tokens ? {
            promptTokens: tokens.inputTokens || 0,
            completionTokens: tokens.outputTokens || 0,
            totalTokens: (tokens.inputTokens || 0) + (tokens.outputTokens || 0),
          } : undefined,
        };
      } catch (error) {
        if (error instanceof CohereError && error.statusCode) {
          if ([401, 403, 404].includes(error.statusCode)) {
            throw new LlmNonRetryableError(`Cohere API Error (${error.statusCode}): Invalid API key or model.`, error.statusCode);
          }
          Object.assign(error, { status: error.statusCode });
        }
        throw error;
      }
    }, config.maxRetries);
  }

  const endpoint = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;

  const payload: any = {
    model,
    messages: options.messages,
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxTokens ?? 1500,
  };

  if (options.jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  return withRetry(async () => {
    const res = await fetch(endpoint, {
      method: 'POST',
      redirect: options.localProxyOnly ? 'error' : 'follow',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'User-Agent': 'NewsToOpportunities/1.0',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      if ([401, 403, 404].includes(res.status)) {
        throw new LlmNonRetryableError(
          `LLM Server Configuration Error (${res.status}): Please check LLM_API_KEY, LLM_BASE_URL, and LLM_MODEL settings.`,
          res.status
        );
      }
      const err = new Error(`LLM HTTP ${res.status} ${res.statusText}: ${errText}`);
      (err as any).status = res.status;
      throw err;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';

    return {
      content,
      model: data.model || model,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0,
          }
        : undefined,
    };
  }, config.maxRetries);
}

/**
 * Parses and validates JSON returned by the LLM. Optional validator function enforces schema constraints.
 */
export function parseLlmJsonResponse<T>(
  rawContent: string,
  validator?: (data: any) => boolean
): T {
  try {
    let cleaned = rawContent.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
    }
    const parsed = JSON.parse(cleaned);
    if (validator && !validator(parsed)) {
      throw new Error('Response payload failed schema validation check.');
    }
    return parsed as T;
  } catch (err: any) {
    throw new Error(`Failed to parse LLM JSON response: ${err.message}`);
  }
}

/**
 * Mock response generator for dry-runs or unauthenticated environments.
 */
function generateMockLlmResponse(options: LlmRequestOptions): LlmCompletionResponse {
  const userMessage = options.messages.find((m) => m.role === 'user')?.content || '';
  const isQA = !options.jsonMode || userMessage.includes('User Question:');

  if (isQA) {
    // Extract actual user question line
    const match = userMessage.match(/User Question:\s*(.*)/i);
    const query = match ? match[1].trim() : userMessage.slice(-100);

    const qaAnswer = `🧭 **Radar Scout Venture Analysis**:

Thank you for your directive: *"${query}"*

1. **Strategic Feasibility & Execution (86% Confidence)**:
   - High viability backed by supportive policy shifts and CapEx incentives across target regions.
   - Modular deployment model lowers initial risk footprint.

2. **Market Impact & Value Capture**:
   - Addressable demand expanding rapidly as commercial anchors seek resilient energy & supply chain solutions.
   - Recommended 90-day field test: Execute pilot off-taker agreements and verify local regulatory tariffs.

3. **Key Risk Mitigation Roadmap**:
   - Lock in multi-supplier SLAs to hedge against component lead-time fluctuations.
   - Establish pre-cleared regulatory approvals early to secure first-mover advantage.`;

    return {
      content: qaAnswer,
      model: 'mock-radar-scout-ai',
      usage: { promptTokens: 120, completionTokens: 280, totalTokens: 400 },
    };
  }

  const mockOpportunities = [
    {
      type: 'business',
      title: 'Solar Microgrid & Energy Storage Expansion',
      short_description: 'Leverage localized renewable energy incentives and tariff reductions to deploy modular microgrids.',
      long_description: 'Recent policy incentives and trade concessions indicate a rapid shift toward decentralized solar storage solutions across targeted manufacturing zones.',
      feasibility_score: 82.5,
      impact_score: 88.0,
      time_to_market_score: 75.0,
      risks: ['Supply chain delay for battery cells', 'Local regulatory compliance'],
      assumptions: ['Subsidy retention for 24 months', 'Grid interconnection approval within 60 days'],
    },
    {
      type: 'innovation',
      title: 'AI-Powered Supply Chain Risk Assessment Platform',
      short_description: 'Build predictive logistics tracking for regional trade disruptions.',
      long_description: 'Ingest trade policy shifts and logistics bottleneck data to provide real-time risk scores for cross-border freight routes.',
      feasibility_score: 85.0,
      impact_score: 90.0,
      time_to_market_score: 80.0,
      risks: ['Data latency from port APIs'],
      assumptions: ['High demand from enterprise exporters'],
    },
  ];

  return {
    content: JSON.stringify({ opportunities: mockOpportunities }, null, 2),
    model: 'mock-llm-provider',
    usage: { promptTokens: 100, completionTokens: 250, totalTokens: 350 },
  };
}
