import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { IngestionAgent } from '@/src/pipeline/agents/ingestionAgent';
import { ClusteringAgent } from '@/src/pipeline/agents/clusteringAgent';
import { OpportunityAgent } from '@/src/pipeline/agents/opportunityAgent';
import { AgentType } from '@/src/pipeline/types';
import { closePool } from '@/src/db/index';

/**
 * Independent worker entrypoint. Spawned by the orchestrator as a child
 * process: `npx tsx scripts/pipeline-worker.ts <ingestion|clustering|opportunity>`.
 *
 * Claims one pending pipeline_events row with FOR UPDATE SKIP LOCKED,
 * executes the stage, persists the outcome, and exits.
 */
async function main(): Promise<void> {
  const agentType = process.argv[2] as AgentType | undefined;
  if (!agentType || !['ingestion', 'clustering', 'opportunity'].includes(agentType)) {
    console.error('Usage: pipeline-worker.ts <ingestion|clustering|opportunity>');
    process.exit(2);
  }

  let exitCode: number;
  switch (agentType) {
    case 'ingestion':
      exitCode = await new IngestionAgent().runOnce();
      break;
    case 'clustering':
      exitCode = await new ClusteringAgent().runOnce();
      break;
    case 'opportunity':
      exitCode = await new OpportunityAgent().runOnce();
      break;
  }

  await closePool().catch(() => undefined);
  process.exit(exitCode);
}

main().catch((err) => {
  console.error('[Pipeline Worker] Fatal error:', err);
  process.exit(1);
});
