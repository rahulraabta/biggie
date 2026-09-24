"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLlmConfig = getLlmConfig;
exports.completeChat = completeChat;
exports.parseLlmJsonResponse = parseLlmJsonResponse;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Reads LLM provider settings from environment variables with sensible defaults.
 * Works with Cloudflare Workers AI, Mistral API, Eden AI, Groq, OpenRouter, Together AI, or Ollama.
 */
function getLlmConfig() {
    return {
        baseUrl: process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1',
        apiKey: process.env.LLM_API_KEY || '',
        model: process.env.LLM_MODEL || 'llama-3.3-70b-versatile',
        maxRetries: parseInt(process.env.LLM_MAX_RETRIES || '3', 10),
    };
}
/**
 * Retries an async LLM request with exponential backoff on HTTP rate limits or temporary errors.
 */
async function withRetry(fn, maxRetries = 3, initialDelayMs = 1000) {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            return await fn();
        }
        catch (err) {
            attempt++;
            if (attempt >= maxRetries)
                throw err;
            const delay = initialDelayMs * Math.pow(2, attempt - 1);
            console.warn(`[LLM Gateway Retry] Attempt ${attempt} failed: ${err.message}. Retrying in ${delay}ms...`);
            await new Promise((res) => setTimeout(res, delay));
        }
    }
    throw new Error('LLM Gateway retry limit reached');
}
/**
 * Sends a chat completion request to any OpenAI-compatible LLM endpoint.
 */
async function completeChat(options, customConfig) {
    const config = { ...getLlmConfig(), ...customConfig };
    const model = options.model || config.model;
    // Fallback to mock LLM response if no API key is provided and running locally/dry-run
    if (!config.apiKey && !process.env.LLM_BASE_URL?.includes('localhost') && !process.env.LLM_BASE_URL?.includes('127.0.0.1')) {
        console.warn('[LLM Gateway Warning] No LLM_API_KEY configured. Returning structured mock response.');
        return generateMockLlmResponse(options);
    }
    const endpoint = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const payload = {
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
            throw new Error(`LLM HTTP ${res.status} ${res.statusText}: ${errText}`);
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
 * Parses and validates JSON returned by the LLM.
 */
function parseLlmJsonResponse(rawContent) {
    try {
        // Strip markdown code block wrappers if present (e.g. ```json ... ```)
        let cleaned = rawContent.trim();
        if (cleaned.startsWith('```json')) {
            cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
        }
        else if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
        }
        return JSON.parse(cleaned);
    }
    catch (err) {
        throw new Error(`Failed to parse LLM JSON response: ${rawContent}`);
    }
}
/**
 * Mock response generator for dry-runs or unauthenticated environments.
 */
function generateMockLlmResponse(options) {
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
