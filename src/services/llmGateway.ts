import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface LlmRequestOptions {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
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
 * Automatically selects Cohere API if COHERE_API_KEY is present in environment.
 */
export function getLlmConfig(): LlmConfig {
  const cohereKey = (process.env.COHERE_API_KEY || '').trim();
  const genericKey = (process.env.LLM_API_KEY || '').trim();
  const apiKey = cohereKey || genericKey;

  const isCohere = Boolean(cohereKey);

  return {
    baseUrl: process.env.LLM_BASE_URL || (isCohere ? 'https://api.cohere.com/v2' : 'https://api.groq.com/openai/v1'),
    apiKey,
    model: process.env.LLM_MODEL || (isCohere ? 'command-r-08-2024' : 'llama-3.3-70b-versatile'),
    maxRetries: parseInt(process.env.LLM_MAX_RETRIES || '5', 10),
  };
}

export class LlmNonRetryableError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'LlmNonRetryableError';
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
  const model = options.model || config.model;

  const isLocalEndpoint = config.baseUrl.includes('localhost') || config.baseUrl.includes('127.0.0.1');
  if (!config.apiKey && !isLocalEndpoint) {
    throw new LlmNonRetryableError(
      'No valid COHERE_API_KEY or LLM_API_KEY found in environment (.env / .env.local). Please set COHERE_API_KEY.',
      401
    );
  }

  const isCohere = config.baseUrl.includes('cohere.com');

  if (isCohere) {
    const endpoint = config.baseUrl.endsWith('/chat') ? config.baseUrl : `${config.baseUrl.replace(/\/$/, '')}/chat`;
    const payload: any = {
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.3,
    };

    if (options.jsonMode) {
      payload.response_format = { type: 'json_object' };
    }

    return withRetry(async () => {
      const res = await fetch(endpoint, {
        method: 'POST',
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
            `Cohere API Error (${res.status}): ${errText || 'Invalid API Key or Model'}`,
            res.status
          );
        }
        const err = new Error(`Cohere HTTP ${res.status} ${res.statusText}: ${errText}`);
        (err as any).status = res.status;
        throw err;
      }

      const data = await res.json();
      const content = data.message?.content?.[0]?.text || '';

      return {
        content,
        model: data.id ? `cohere-${model}` : model,
        usage: data.usage?.tokens
          ? {
              promptTokens: data.usage.tokens.input_tokens || 0,
              completionTokens: data.usage.tokens.output_tokens || 0,
              totalTokens: (data.usage.tokens.input_tokens || 0) + (data.usage.tokens.output_tokens || 0),
            }
          : undefined,
      };
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
