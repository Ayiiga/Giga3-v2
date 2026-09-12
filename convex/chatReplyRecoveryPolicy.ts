/**
 * Pure decision logic for recovering stuck chat reply jobs. Kept free of Convex
 * imports so it can be unit tested in isolation.
 */

import { chatJobProcessingBudgetMs } from "./chatTiming";

export type JobRecoveryStatus =
  | "pending"
  | "processing"
  | "done"
  | "failed"
  | "cancelled";

export type JobRecoveryInput = {
  status: JobRecoveryStatus;
  cancelled?: boolean;
  createdAt: number;
  /** Set when beginProcessing runs — used for active worker budget. */
  processingStartedAt?: number;
};

export type JobRecoveryAction =
  /** Job finished/cancelled — just remove the leftover row. */
  | "cleanup"
  /** Pending job that was never picked up — schedule the worker again. */
  | "reschedule"
  /** Worker is dead — write a fallback reply (if none) and remove the job. */
  | "finalize"
  /** Job is young / actively processing — leave it alone. */
  | "wait";

export type JobRecoveryConfig = {
  rescheduleAfterMs: number;
  /** Pending jobs that never start processing. */
  pendingGiveUpAfterMs: number;
  /** Active worker budget from processingStartedAt (live web + AI). */
  processingGiveUpAfterMs: number;
};

export const DEFAULT_JOB_RECOVERY_CONFIG: JobRecoveryConfig = {
  rescheduleAfterMs:
    Number(process.env.CHAT_JOB_RESCHEDULE_AFTER_MS) || 30_000,
  pendingGiveUpAfterMs:
    Number(process.env.CHAT_JOB_PENDING_GIVE_UP_AFTER_MS) || 90_000,
  processingGiveUpAfterMs:
    Number(process.env.CHAT_JOB_PROCESSING_GIVE_UP_AFTER_MS) ||
    chatJobProcessingBudgetMs({ hasImageAttachment: true }),
};

export function decideJobRecovery(
  job: JobRecoveryInput,
  now: number,
  config: JobRecoveryConfig = DEFAULT_JOB_RECOVERY_CONFIG
): JobRecoveryAction {
  if (
    job.cancelled ||
    job.status === "cancelled" ||
    job.status === "done" ||
    job.status === "failed"
  ) {
    return "cleanup";
  }

  const age = now - job.createdAt;

  if (job.status === "processing") {
    const processingAge = job.processingStartedAt
      ? now - job.processingStartedAt
      : age;
    if (processingAge >= config.processingGiveUpAfterMs) {
      return "finalize";
    }
    return "wait";
  }

  if (job.status === "pending" && age >= config.pendingGiveUpAfterMs) {
    return "finalize";
  }

  if (job.status === "pending" && age >= config.rescheduleAfterMs) {
    return "reschedule";
  }

  return "wait";
}
