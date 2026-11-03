import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function checkGateway(baseUrl: string | undefined, checks: string) {
  const childEnv = {
    ...process.env,
    DOTENV_CONFIG_PATH: 'tests/.missing-env',
    DATABASE_URL: 'postgres://test:test@localhost:5432/biggie_test',
    LLM_BASE_URL: baseUrl,
    LLM_API_KEY: '',
    OPENAI_BASE_URL: '',
    OPENAI_API_KEY: '',
    COHERE_API_KEY: '',
  };
  if (baseUrl === undefined) delete childEnv.LLM_BASE_URL;
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    const { completeChat, getLlmConfig } = await import('./src/services/llmGateway.ts');
    ${checks}
  `], { env: childEnv, encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
}

for (const baseUrl of [undefined, '', '   ']) {
  test(`gateway imports with ${JSON.stringify(baseUrl)} URL and uses request-time defaults`, () => {
    checkGateway(baseUrl, `
      assert.equal(getLlmConfig().baseUrl, 'https://agentrouter.org/v1');
      assert.equal(getLlmConfig().apiKey, 'dummy-key');
      globalThis.fetch = async (url, init) => {
        assert.equal(url, 'https://agentrouter.org/v1/chat/completions');
        assert.equal(init.headers.Authorization, 'Bearer dummy-key');
        return Response.json({ choices: [{ message: { content: 'ok' } }] });
      };
      assert.equal((await completeChat({ messages: [{ role: 'user', content: 'Hi' }] })).content, 'ok');
    `);
  });
}

test('invalid URL does not fail module loading and configuration is read on first use', () => {
  checkGateway('not-a-url', `
    assert.throws(() => getLlmConfig(), /Invalid URL/);
    process.env.LLM_BASE_URL = 'https://provider.example/v1';
    process.env.LLM_API_KEY = 'request-key';
    assert.equal(getLlmConfig().baseUrl, 'https://provider.example/v1');
    assert.equal(getLlmConfig().apiKey, 'request-key');
  `);
});
