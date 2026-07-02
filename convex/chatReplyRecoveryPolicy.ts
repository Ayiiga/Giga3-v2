/**
 * Pure decision logic for recovering stuck chat reply jobs. Kept free of Convex
 * imports so it can be unit tested in isolation.
 */

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
  giveUpAfterMs: number;
};

export const DEFAULT_JOB_RECOVERY_CONFIG: JobRecoveryConfig = {
  rescheduleAfterMs: Number(process.env.CHAT_JOB_RESCHEDULE_AFTER_MS) || 30_000,
  giveUpAfterMs: Number(process.env.CHAT_JOB_GIVE_UP_AFTER_MS) || 90_000,
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

  if (
    (job.status === "pending" || job.status === "processing") &&
    age >= config.giveUpAfterMs
  ) {
    return "finalize";
  }

  if (job.status === "pending" && age >= config.rescheduleAfterMs) {
    return "reschedule";
  }

  return "wait";
}
