import test from 'node:test';
import assert from 'node:assert/strict';
import { completeChat, LlmNonRetryableError } from '../src/services/llmGateway';

test('Cohere SDK authenticates from COHERE_API_KEY and preserves JSON output and token usage', async (t) => {
  const previous = process.env.COHERE_API_KEY;
  process.env.COHERE_API_KEY = 'test-cohere-key';
  t.after(() => {
    if (previous === undefined) delete process.env.COHERE_API_KEY;
    else process.env.COHERE_API_KEY = previous;
  });
  let called = false;
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    called = true;
    assert.equal(String(input), 'https://api.cohere.com/v2/chat');
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer test-cohere-key');
    const body = JSON.parse(init?.body as string);
    assert.equal(body.model, 'command-r-08-2024');
    assert.deepEqual(body.response_format, { type: 'json_object' });
    assert.equal(body.max_tokens, 100);
    return new Response(JSON.stringify({
      id: 'test', finish_reason: 'COMPLETE', message: { role: 'assistant', content: [{ type: 'text', text: '{"approved":true}' }] },
      usage: { tokens: { input_tokens: 10, output_tokens: 5 } },
    }), { headers: { 'Content-Type': 'application/json' } });
  });
  const result = await completeChat({ messages: [{ role: 'user', content: 'Classify this event as JSON.' }], jsonMode: true, maxTokens: 100 }, {
    baseUrl: 'https://api.cohere.com/v2', apiKey: 'unused-generic-key', model: 'command-r-08-2024', maxRetries: 1,
  });
  assert.equal(called, true);
  assert.equal(result.content, '{"approved":true}');
  assert.deepEqual(result.usage, { promptTokens: 10, completionTokens: 5, totalTokens: 15 });
});

test('Cohere authentication failures are not retried', async (t) => {
  const request = t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ message: 'Invalid API token' }), {
    status: 401, headers: { 'Content-Type': 'application/json' },
  }));
  await assert.rejects(completeChat({ messages: [{ role: 'user', content: 'Classify this event.' }] }, {
    baseUrl: 'https://api.cohere.com/v2', apiKey: 'test-invalid-key', model: 'command-r-08-2024', maxRetries: 3,
  }), (error: unknown) => error instanceof LlmNonRetryableError && error.status === 401);
  assert.equal(request.mock.callCount(), 1);
});
