import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AgentType, PipelineEvent } from './types.js';
import {
  createTaskEvent,
  getStageResult,
  reclaimStaleTasks,
} from './eventStore.js';
import { closePool } from '@/src/db/index';

export interface OrchestratorOptions {
  dryRun?: boolean;
  ingestion?: { maxLines?: number; urlOverride?: string };
  clustering?: { limit?: number };
  opportunity?: { limit?: number };
  pollIntervalMs?: number;
  stageTimeoutMs?: number;
  staleTaskMs?: number;
}

const DEFAULT_POLL_MS = 2000;
const DEFAULT_STAGE_TIMEOUT_MS = 30 * 60 * 1000;
const DEFAULT_STALE_MS = 60 * 60 * 1000;

/**
 * Sequential multi-agent orchestrator.
 *
 * For each stage it: (1) enqueues a task event, (2) spawns an independent
 * worker child process that claims the task with SELECT ... FOR UPDATE SKIP
 * LOCKED, and (3) polls the pipeline_events table until the stage reaches a
 * terminal state. A failed stage aborts the run.
 */
export class Orchestrator {
  readonly runId: string;
  private readonly opts: Required<Pick<OrchestratorOptions,
    'pollIntervalMs' | 'stageTimeoutMs' | 'staleTaskMs'>> & OrchestratorOptions;
  private child: ChildProcess | null = null;
  private aborted = false;

  constructor(options: OrchestratorOptions = {}) {
    this.runId = randomUUID();
    this.opts = {
      ...options,
      pollIntervalMs: options.pollIntervalMs ?? DEFAULT_POLL_MS,
      stageTimeoutMs: options.stageTimeoutMs ?? DEFAULT_STAGE_TIMEOUT_MS,
      staleTaskMs: options.staleTaskMs ?? DEFAULT_STALE_MS,
    };
  }

  async run(): Promise<void> {
    console.log(`\n============ PIPELINE ORCHESTRATOR RUN ${this.runId} ============`);
    const onSig = () => this.abort('signal received');
    process.once('SIGINT', onSig);
    process.once('SIGTERM', onSig);

    try {
      const reclaimed = await reclaimStaleTasks(this.opts.staleTaskMs);
      if (reclaimed > 0) {
        console.log(`[Orchestrator] Requeued ${reclaimed} stale running task(s).`);
      }

      const stages: Array<{ type: AgentType; payload: Record<string, unknown> }> = [
        {
          type: 'ingestion',
          payload: {
            dryRun: this.opts.dryRun,
            maxLines: this.opts.ingestion?.maxLines,
            urlOverride: this.opts.ingestion?.urlOverride,
          },
        },
        {
          type: 'clustering',
          payload: {
            dryRun: this.opts.dryRun,
            limit: this.opts.clustering?.limit,
          },
        },
        {
          type: 'opportunity',
          payload: {
            dryRun: this.opts.dryRun,
            limit: this.opts.opportunity?.limit,
          },
        },
      ];

      for (const stage of stages) {
        if (this.aborted) break;
        await this.runStage(stage.type, stage.payload);
      }

      if (this.aborted) {
        console.error(`\n[Orchestrator] Run ${this.runId} aborted.`);
        process.exitCode = 130;
      } else {
        console.log(`\n[Orchestrator] Run ${this.runId} completed successfully.`);
      }
    } catch (err) {
      console.error(`\n[Orchestrator] Run ${this.runId} failed:`, err);
      process.exitCode = 1;
    } finally {
      process.removeListener('SIGINT', onSig);
      process.removeListener('SIGTERM', onSig);
      await closePool().catch(() => undefined);
    }
  }

  private async runStage(agentType: AgentType, payload: Record<string, unknown>): Promise<void> {
    console.log(`\n[Orchestrator] Stage "${agentType}" dispatching...`);
    const event = await createTaskEvent(this.runId, agentType, payload);
    const child = this.spawnWorker(agentType);
    this.child = child;

    try {
      const resultEvent = await this.waitForStage(agentType, event.id);
      if (this.aborted) return;

      if (resultEvent.status === 'failed') {
        throw new Error(
          `Stage "${agentType}" failed: ${resultEvent.error_message || 'unknown error'}`
        );
      }
      console.log(`[Orchestrator] Stage "${agentType}" completed.`);
      this.logStageSummary(agentType, resultEvent);
    } finally {
      this.child = null;
      await this.waitForChildExit(child);
    }
  }

  private spawnWorker(agentType: AgentType): ChildProcess {
    const workerScript = path.resolve(process.cwd(), 'scripts', 'pipeline-worker.ts');
    // node --import tsx runs the TS worker without a shell (avoids DEP0190
    // and keeps argv unescaped-safe on Windows).
    const child = spawn(process.execPath, ['--import', 'tsx', workerScript, agentType], {
      stdio: 'inherit',
      env: { ...process.env },
    });

    child.on('error', (err) => {
      console.error(`[Orchestrator] Failed to spawn ${agentType} worker:`, err);
    });

    return child;
  }

  /**
   * Polls pipeline_events (read-only) until the stage's event reaches a
   * terminal state or the stage timeout elapses.
   */
  private async waitForStage(agentType: AgentType, eventId: number): Promise<PipelineEvent> {
    const deadline = Date.now() + this.opts.stageTimeoutMs;
    while (Date.now() < deadline) {
      if (this.aborted) {
        throw new Error(`Stage "${agentType}" aborted`);
      }
      const row = await getStageResult(this.runId, agentType);
      if (row && row.id === eventId &&
          (row.status === 'completed' || row.status === 'failed')) {
        return row;
      }
      await sleep(this.opts.pollIntervalMs);
    }
    throw new Error(
      `Stage "${agentType}" timed out after ${Math.round(this.opts.stageTimeoutMs / 1000)}s`
    );
  }

  private waitForChildExit(child: ChildProcess): Promise<void> {
    if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
    return new Promise((resolve) => {
      child.once('exit', () => resolve());
      // Safety net: if the child hangs after a terminal DB state, detach.
      const t = setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) {
          child.kill();
        }
        resolve();
      }, 30_000);
      child.once('exit', () => clearTimeout(t));
    });
  }

  private logStageSummary(agentType: AgentType, event: PipelineEvent): void {
    const p = event.payload as Record<string, unknown>;
    if (agentType === 'ingestion') {
      console.log(
        `[Orchestrator]   processed=${p.totalProcessed} relevant=${p.filteredRelevant} ` +
        `inserted=${p.insertedCount} updated=${p.updatedCount} errors=${p.errorCount} ` +
        `duration=${p.durationMs}ms`
      );
    } else if (agentType === 'clustering') {
      console.log(
        `[Orchestrator]   articles=${p.totalUnclusteredProcessed} clusters=${p.clustersCreated} ` +
        `clustered=${p.articlesClustered}`
      );
    } else if (agentType === 'opportunity') {
      console.log(
        `[Orchestrator]   clusters=${p.totalClustersProcessed} opportunities=${p.opportunitiesGenerated} ` +
        `embedded=${p.opportunitiesEmbedded}`
      );
    }
  }

  private abort(reason: string): void {
    if (this.aborted) return;
    this.aborted = true;
    console.error(`\n[Orchestrator] Aborting (${reason})...`);
    if (this.child && this.child.exitCode === null) {
      this.child.kill();
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
