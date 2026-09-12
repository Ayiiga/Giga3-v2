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
  processingStartedAt?: number;
  lastActivityAt?: number;
  rescheduleCount?: number;
};

export type JobRecoveryAction =
  | "cleanup"
  | "reschedule"
  | "finalize"
  | "wait";

export type JobRecoveryConfig = {
  rescheduleAfterMs: number;
  pendingGiveUpAfterMs: number;
  processingGiveUpAfterMs: number;
  activityGraceMs: number;
  maxReschedulesBeforeFinalize: number;
};

export function getJobRecoveryConfig(
  env: Record<string, string | undefined> = process.env
): JobRecoveryConfig {
  const envMs = (name: string, fallback: number) => {
    const raw = Number(env[name]);
    return Number.isFinite(raw) && raw > 0 ? raw : fallback;
  };
  return {
    rescheduleAfterMs: envMs("CHAT_JOB_RESCHEDULE_AFTER_MS", 30_000),
    pendingGiveUpAfterMs: envMs("CHAT_JOB_PENDING_GIVE_UP_AFTER_MS", 180_000),
    processingGiveUpAfterMs:
      envMs("CHAT_JOB_PROCESSING_GIVE_UP_AFTER_MS", 0) ||
      chatJobProcessingBudgetMs({ hasImageAttachment: true }),
    activityGraceMs: envMs("CHAT_JOB_ACTIVITY_GRACE_MS", 120_000),
    maxReschedulesBeforeFinalize: envMs("CHAT_JOB_MAX_RESCHEDULES", 4),
  };
}

/** @deprecated Use getJobRecoveryConfig() for runtime env reads. */
export const DEFAULT_JOB_RECOVERY_CONFIG: JobRecoveryConfig = getJobRecoveryConfig();

function isRecentlyActive(
  job: JobRecoveryInput,
  now: number,
  graceMs: number
): boolean {
  if (job.status !== "processing") return false;
  const last = job.lastActivityAt ?? job.processingStartedAt;
  if (!last) return false;
  return now - last < graceMs;
}

export function decideJobRecovery(
  job: JobRecoveryInput,
  now: number,
  config: JobRecoveryConfig = getJobRecoveryConfig()
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
  const reschedules = job.rescheduleCount ?? 0;

  if (job.status === "processing") {
    if (isRecentlyActive(job, now, config.activityGraceMs)) {
      return "wait";
    }
    const processingAge = job.processingStartedAt
      ? now - job.processingStartedAt
      : age;
    if (processingAge >= config.processingGiveUpAfterMs) {
      if (reschedules < config.maxReschedulesBeforeFinalize) {
        return "reschedule";
      }
      return "finalize";
    }
    return "wait";
  }

  if (job.status === "pending") {
    if (age >= config.pendingGiveUpAfterMs) {
      if (reschedules < config.maxReschedulesBeforeFinalize) {
        return "reschedule";
      }
      return "finalize";
    }
    if (age >= config.rescheduleAfterMs) {
      return "reschedule";
    }
  }

  return "wait";
}
