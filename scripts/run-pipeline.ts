import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { Orchestrator } from '@/src/pipeline/orchestrator';

/**
 * CLI entrypoint for the multi-agent pipeline.
 *
 * Usage:
 *   npx tsx scripts/run-pipeline.ts [--dry-run] [--max-lines=N] [--cluster-limit=N]
 *                                   [--opportunity-limit=N] [--poll-ms=N] [--timeout-ms=N]
 */
function parseArgs(argv: string[]): {
  dryRun: boolean;
  maxLines?: number;
  clusterLimit?: number;
  opportunityLimit?: number;
  pollMs?: number;
  timeoutMs?: number;
} {
  const out: ReturnType<typeof parseArgs> = { dryRun: false };
  for (const arg of argv) {
    if (arg === '--dry-run' || arg === '-d') out.dryRun = true;
    else if (arg.startsWith('--max-lines=')) out.maxLines = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--cluster-limit=')) out.clusterLimit = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--opportunity-limit=')) out.opportunityLimit = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--poll-ms=')) out.pollMs = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--timeout-ms=')) out.timeoutMs = parseInt(arg.split('=')[1], 10);
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const orchestrator = new Orchestrator({
    dryRun: args.dryRun,
    ingestion: { maxLines: args.maxLines },
    clustering: { limit: args.clusterLimit },
    opportunity: { limit: args.opportunityLimit },
    pollIntervalMs: args.pollMs,
    stageTimeoutMs: args.timeoutMs,
  });

  await orchestrator.run();
}

main().catch((err) => {
  console.error('[Run Pipeline] Fatal error:', err);
  process.exit(1);
});
