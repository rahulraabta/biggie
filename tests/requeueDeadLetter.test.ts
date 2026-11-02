import test from 'node:test';
import assert from 'node:assert/strict';
import { runRequeue, parseArgs, COUNT_SQL, UPDATE_SQL } from '../scripts/requeue-dead-letter.js';

interface RecordedQuery {
  text: string;
  params: unknown[] | undefined;
}

let poolQueryCalls: RecordedQuery[] = [];
let clientQueryCalls: RecordedQuery[] = [];
let connectCalls = 0;

interface FakePoolOptions {
  matched: number;
  requeued?: Array<{ id: number; agent_type: string }>;
}

/**
 * Installs the globalThis.pgPool seam used by src/db/index.ts. No real DB
 * connection is opened: the count runs through pool.query(), the requeue
 * transaction through pool.connect().
 */
function installFakePool(options: FakePoolOptions): void {
  poolQueryCalls = [];
  clientQueryCalls = [];
  connectCalls = 0;

  (globalThis as unknown as { pgPool: unknown }).pgPool = {
    query: async (text: string, params?: unknown[]) => {
      poolQueryCalls.push({ text, params });
      return { rows: [{ count: options.matched }], rowCount: 1 };
    },
    connect: async () => {
      connectCalls += 1;
      return {
        query: async (text: string, params?: unknown[]) => {
          clientQueryCalls.push({ text, params });
          if (text.trimStart().startsWith('UPDATE')) {
            const rows = options.requeued ?? [];
            return { rows, rowCount: rows.length };
          }
          return { rows: [], rowCount: 0 };
        },
        release: () => undefined,
      };
    },
  };
}

function captureConsoleLog(): { logs: string[]; restore: () => void } {
  const logs: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    logs.push(args.map((arg) => String(arg)).join(' '));
  };
  return { logs, restore: () => { console.log = original; } };
}

class ExitSignal extends Error {
  constructor(readonly code: number | undefined) {
    super(`process.exit(${code})`);
  }
}

async function withExitSpy(fn: () => Promise<void>): Promise<{ exitCodes: Array<number | undefined>; threw: boolean }> {
  const original = process.exit;
  const exitCodes: Array<number | undefined> = [];
  process.exit = ((code?: number): never => {
    exitCodes.push(code);
    throw new ExitSignal(code);
  }) as typeof process.exit;
  try {
    await fn();
    return { exitCodes, threw: false };
  } catch (err) {
    if (err instanceof ExitSignal) return { exitCodes, threw: true };
    throw err;
  } finally {
    process.exit = original;
  }
}

test('requeue CLI - missing --since prints usage and exits 1', async () => {
  installFakePool({ matched: 0 });
  const errors: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args.map((arg) => String(arg)).join(' '));
  };

  try {
    const { exitCodes, threw } = await withExitSpy(() => runRequeue(['--agent=all']));

    assert.equal(threw, true);
    assert.deepEqual(exitCodes, [1]);
    assert.match(errors.join('\n'), /Usage:/);
    assert.equal(poolQueryCalls.length, 0, 'must not query the DB without --since');
    assert.equal(connectCalls, 0);
  } finally {
    console.error = originalError;
  }
});

test('requeue CLI - --dry-run counts matches and performs no UPDATE', async () => {
  installFakePool({ matched: 7 });
  const { logs, restore } = captureConsoleLog();
  try {
    await runRequeue(['--since=2026-01-01T00:00:00.000Z', '--dry-run']);
  } finally {
    restore();
  }

  assert.equal(poolQueryCalls.length, 1);
  assert.equal(poolQueryCalls[0].text, COUNT_SQL);
  assert.equal(connectCalls, 0, 'dry-run must not open the transaction');
  assert.equal(clientQueryCalls.length, 0, 'dry-run must not issue an UPDATE');
  assert.deepEqual(logs, ['Matched: 7 | Would requeue: 7']);
});

test('requeue CLI - normal run issues the expected UPDATE SQL and params', async () => {
  installFakePool({
    matched: 3,
    requeued: [
      { id: 11, agent_type: 'ingestion' },
      { id: 12, agent_type: 'ingestion' },
    ],
  });
  const { logs, restore } = captureConsoleLog();
  const since = '2026-01-01T00:00:00.000Z';
  const until = '2026-02-01T00:00:00.000Z';

  try {
    await runRequeue([`--since=${since}`, `--until=${until}`, '--limit=25', '--reason="ops cleanup"']);
  } finally {
    restore();
  }

  assert.equal(connectCalls, 1);
  assert.deepEqual(clientQueryCalls.map((call) => call.text), ['BEGIN', UPDATE_SQL, 'COMMIT']);

  const update = clientQueryCalls[1];
  assert.match(update.text, /SET status = 'pending'/);
  assert.match(update.text, /retry_count = 0/);
  assert.match(update.text, /FOR UPDATE SKIP LOCKED/);
  assert.deepEqual(update.params, [since, until, 'all', 25]);

  // Requeued ids come from the rows the UPDATE returned.
  assert.equal(logs[0], 'Matched: 3 | Requeued: 2 | Skipped: 1');
  assert.equal(logs[1], 'Requeued ids: 11, 12');
  assert.equal(logs[2], 'Reason: ops cleanup');
});

test('requeue CLI - agent filter selects all vs a single agent ($3)', async () => {
  const since = '2026-01-01T00:00:00.000Z';

  installFakePool({ matched: 0 });
  const first = captureConsoleLog();
  try {
    await runRequeue([`--since=${since}`]);
  } finally {
    first.restore();
  }
  assert.equal(poolQueryCalls[0].params?.[2], 'all');
  assert.equal(clientQueryCalls.find((call) => call.text === UPDATE_SQL)?.params?.[2], 'all');

  installFakePool({ matched: 0 });
  const second = captureConsoleLog();
  try {
    await runRequeue([`--since=${since}`, '--agent=opportunity']);
  } finally {
    second.restore();
  }
  assert.equal(poolQueryCalls[0].params?.[2], 'opportunity');
  assert.equal(clientQueryCalls.find((call) => call.text === UPDATE_SQL)?.params?.[2], 'opportunity');
});

test('requeue CLI - parseArgs validates flags and defaults', () => {
  assert.equal(parseArgs([]), null);
  assert.equal(parseArgs(['--agent=all']), null);
  assert.equal(parseArgs(['--since=not-a-date']), null);
  assert.equal(parseArgs(['--since=2026-01-01T00:00:00.000Z', '--agent=bogus']), null);
  assert.equal(parseArgs(['--since=2026-01-01T00:00:00.000Z', '--limit=0']), null);

  const parsed = parseArgs(['--since=2026-01-01T00:00:00.000Z']);
  assert.ok(parsed);
  assert.equal(parsed.agent, 'all');
  assert.equal(parsed.limit, 100);
  assert.equal(parsed.dryRun, false);
  assert.ok(!Number.isNaN(Date.parse(parsed.until)));
});
