import { AgentType, PipelineEvent } from '../types.js';
import { claimNextTask, markCompleted, markFailed, markDeadLetter } from '../eventStore.js';
import { env } from '@/src/config/env';

/**
 * Base class for one-shot worker processes.
 * Each worker claims exactly one pending task (FOR UPDATE SKIP LOCKED),
 * executes it, persists the outcome, and exits.
 */
export abstract class BaseAgent {
  abstract readonly agentType: AgentType;

  protected abstract executeTask(event: PipelineEvent): Promise<Record<string, unknown>>;

  get workerId(): string {
    return `${this.agentType}-pid-${process.pid}`;
  }

  /**
   * Claims and executes a single task.
   * @returns exit code — 0 success/no-work, 1 failure.
   */
  async runOnce(): Promise<number> {
    let task: PipelineEvent | null = null;
    try {
      task = await claimNextTask(this.agentType, this.workerId);
    } catch (err) {
      console.error(`[${this.agentType}] Failed to claim task:`, err);
      return 1;
    }

    if (!task) {
      console.log(`[${this.agentType}] No pending tasks.`);
      return 0;
    }

    console.log(`[${this.agentType}] Claimed event ${task.id} (run ${task.run_id})`);
    try {
      const result = await this.executeTask(task);
      await markCompleted(task.id, result);
      console.log(`[${this.agentType}] Event ${task.id} completed.`);
      return 0;
    } catch (err) {
      const msg = err instanceof Error ? (err.stack || err.message) : String(err);
      try {
        const retryCount = await markFailed(task.id, msg);
        if (retryCount >= env.PIPELINE_MAX_RETRIES) {
          await markDeadLetter(task.id, msg);
        }
      } catch (markErr) {
        console.error(`[${this.agentType}] Failed to mark event ${task.id} failed:`, markErr);
      }
      console.error(`[${this.agentType}] Event ${task.id} failed: ${msg}`);
      return 1;
    }
  }
}
