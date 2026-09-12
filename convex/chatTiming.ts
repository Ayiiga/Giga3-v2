/**
 * Shared chat reply timing budgets — keep recovery, worker, and client waits aligned.
 *
 * A reply job can spend time on live web research and fact verification *before*
 * the AI failover chain runs. Recovery must not finalize while the worker is still
 * legitimately processing, or the user sees a timeout fallback and the real answer
 * is dropped by appendAssistantReplyIfMissing dedupe.
 */

function envMs(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export function chatWorkerTextTimeoutMs(): number {
  return envMs("CHAT_WORKER_TIMEOUT_MS", 120_000);
}

export function chatWorkerImageTimeoutMs(): number {
  return envMs("CHAT_WORKER_IMAGE_TIMEOUT_MS", 180_000);
}

/** Upper bound for search + page reads before the model call. */
export function chatLiveWebBudgetMs(): number {
  return envMs("CHAT_LIVE_WEB_BUDGET_MS", 60_000);
}

/** Upper bound for optional fact-verification pass after live web. */
export function chatVerificationBudgetMs(): number {
  return envMs("CHAT_VERIFICATION_BUDGET_MS", 45_000);
}

const PROCESSING_BUFFER_MS = 30_000;

/** Wall-clock budget once the worker marks a job as processing. */
export function chatJobProcessingBudgetMs(options?: {
  hasImageAttachment?: boolean;
}): number {
  const workerMs = options?.hasImageAttachment
    ? chatWorkerImageTimeoutMs()
    : chatWorkerTextTimeoutMs();
  return (
    workerMs +
    chatLiveWebBudgetMs() +
    chatVerificationBudgetMs() +
    PROCESSING_BUFFER_MS
  );
}

/** Recovery waits if the worker reported activity within this window. */
export function chatJobActivityGraceMs(): number {
  return envMs("CHAT_JOB_ACTIVITY_GRACE_MS", 120_000);
}

/** Read env at call time — not module init — so deploy-time env updates apply. */
export function chatRecoveryRescheduleAfterMs(): number {
  return envMs("CHAT_JOB_RESCHEDULE_AFTER_MS", 30_000);
}

export function chatRecoveryPendingGiveUpAfterMs(): number {
  return envMs("CHAT_JOB_PENDING_GIVE_UP_AFTER_MS", 180_000);
}

export function chatRecoveryProcessingGiveUpAfterMs(): number {
  return (
    envMs("CHAT_JOB_PROCESSING_GIVE_UP_AFTER_MS", 0) ||
    chatJobProcessingBudgetMs({ hasImageAttachment: true })
  );
}

/** Client should outlive server recovery so users see the real reply, not a spinner timeout. */
export function chatClientReplyWaitMs(slowNetwork: boolean): number {
  const serverBudget = chatRecoveryProcessingGiveUpAfterMs();
  const clientMs = envMs("CHAT_CLIENT_REPLY_WAIT_MS", serverBudget + 60_000);
  if (slowNetwork) {
    return envMs("CHAT_CLIENT_REPLY_WAIT_SLOW_MS", clientMs + 60_000);
  }
  return clientMs;
}

/** Marker shared with appendAssistantReplyIfMissing — recovery fallback replies. */
export const CHAT_RECOVERY_TIMEOUT_SNIPPET =
  "couldn't finish this reply because our AI service didn't respond in time";

export function isChatRecoveryTimeoutReply(content: string): boolean {
  return content.includes(CHAT_RECOVERY_TIMEOUT_SNIPPET);
}
