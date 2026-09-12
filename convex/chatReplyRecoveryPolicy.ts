/**
 * Pure decision logic for recovering stuck chat reply jobs. Kept free of Convex
 * imports so it can be unit tested in isolation.
 */

import { chatJobProcessingBudgetMs } from "./chatTiming";
import { isConversationalChatQuery } from "./researchCapabilities";

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
  /** Used to avoid recovery timeout stubs on greetings / small talk. */
  content?: string;
  kind?: "reply" | "regenerate" | "conversational";
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
  const conversational =
    job.kind === "conversational" ||
    (typeof job.content === "string" && isConversationalChatQuery(job.content));

  // Fast conversational jobs must never get the generic recovery timeout stub.
  if (conversational) {
    const conversationalPendingLimit = 90_000;
    const conversationalProcessingLimit = 120_000;
    if (job.status === "processing") {
      if (isRecentlyActive(job, now, 45_000)) {
        return "wait";
      }
      const processingAge = job.processingStartedAt
        ? now - job.processingStartedAt
        : age;
      if (processingAge >= conversationalProcessingLimit) {
        return reschedules < 2 ? "reschedule" : "finalize";
      }
      return "wait";
    }
    if (job.status === "pending") {
      if (age >= conversationalPendingLimit) {
        return reschedules < 2 ? "reschedule" : "finalize";
      }
      if (age >= 20_000) {
        return "reschedule";
      }
    }
    return "wait";
  }

  if (job.status === "processing") {
    if (isRecentlyActive(job, now, config.activityGraceMs)) {
      return "wait";
    }
    const processingAge = job.processingStartedAt
      ? now - job.processingStartedAt
      : age;
    const processingLimit = conversational
      ? config.processingGiveUpAfterMs + 120_000
      : config.processingGiveUpAfterMs;
    if (processingAge >= processingLimit) {
      if (reschedules < config.maxReschedulesBeforeFinalize) {
        return "reschedule";
      }
      return "finalize";
    }
    return "wait";
  }

  if (job.status === "pending") {
    const pendingLimit = conversational
      ? config.pendingGiveUpAfterMs * 2
      : config.pendingGiveUpAfterMs;
    if (age >= pendingLimit) {
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
