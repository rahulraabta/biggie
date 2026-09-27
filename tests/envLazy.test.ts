import test from 'node:test';
import assert from 'node:assert/strict';
import { env, getLlmEnv } from '../src/config/env.js';

class ExitSignal extends Error {
  constructor(readonly code: number | undefined) {
    super(`process.exit(${code})`);
  }
}

function withExitSpy<T>(fn: () => T): { value?: T; exitCodes: Array<number | undefined>; threw: boolean } {
  const original = process.exit;
  const exitCodes: Array<number | undefined> = [];
  process.exit = ((code?: number): never => {
    exitCodes.push(code);
    throw new ExitSignal(code);
  }) as typeof process.exit;
  try {
    const value = fn();
    return { value, exitCodes, threw: false };
  } catch (err) {
    if (err instanceof ExitSignal) return { exitCodes, threw: true };
    throw err;
  } finally {
    process.exit = original;
  }
}

test('env - importing infra env needs only DATABASE_URL and no LLM key', () => {
  // Reaching this line at all proves the module did not process.exit(1) while
  // loading with no OPENAI_API_KEY present.
  assert.ok(Object.isFrozen(env));
  assert.ok(env.DATABASE_URL.startsWith('postgres'));
  assert.equal('OPENAI_API_KEY' in env, false, 'OPENAI_API_KEY must not be required eagerly');
  assert.equal(typeof env.PIPELINE_MAX_RETRIES, 'number');
  assert.equal(typeof env.PIPELINE_MAX_PENDING_INGESTION, 'number');
  assert.equal(typeof env.PIPELINE_MAX_PENDING_OPPORTUNITY, 'number');
  assert.equal(typeof env.LLM_RATE_LIMIT_PER_MIN, 'number');
});

// NOTE: this must run before any test that caches a successful getLlmEnv().
test('getLlmEnv - missing OPENAI_API_KEY prints config help and exits 1', () => {
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const errors: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args.map((arg) => String(arg)).join(' '));
  };

  try {
    const { exitCodes, threw } = withExitSpy(() => getLlmEnv());

    assert.equal(threw, true);
    assert.deepEqual(exitCodes, [1]);
    assert.match(errors.join('\n'), /Missing LLM configuration/);
    assert.match(errors.join('\n'), /OPENAI_API_KEY/);
  } finally {
    console.error = originalError;
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  }
});

test('getLlmEnv - returns the validated LLM env when OPENAI_API_KEY is set', () => {
  process.env.OPENAI_API_KEY = 'test';

  const llm = getLlmEnv();

  assert.equal(llm.OPENAI_API_KEY, 'test');
  assert.equal(llm.LLM_MODEL, 'qwen/qwen3.8-max');
  assert.equal(llm.OPENAI_BASE_URL, undefined);
  assert.equal(llm.GDELT_API_URL, undefined);
});

test('getLlmEnv - parses once and caches the result', () => {
  process.env.OPENAI_API_KEY = 'test';
  const first = getLlmEnv();

  const second = getLlmEnv();
  assert.equal(first, second, 'second call must return the cached object');

  // A later env change is ignored, proving no re-parse happens.
  process.env.OPENAI_API_KEY = 'changed-after-cache';
  assert.equal(getLlmEnv().OPENAI_API_KEY, 'test');
});
