/**
 * Shared chat reply timing budgets — keep recovery, worker, and client waits aligned.
 *
 * A reply job can spend time on live web research and fact verification *before*
 * the AI failover chain runs. Recovery must not finalize while the worker is still
 * legitimately processing, or the user sees a timeout fallback and the real answer
 * is dropped by appendAssistantReplyIfMissing dedupe.
 */

export const CHAT_WORKER_TEXT_TIMEOUT_MS =
  Number(process.env.CHAT_WORKER_TIMEOUT_MS) || 120_000;
export const CHAT_WORKER_IMAGE_TIMEOUT_MS =
  Number(process.env.CHAT_WORKER_IMAGE_TIMEOUT_MS) || 150_000;

/** Upper bound for search + page reads before the model call. */
export const CHAT_LIVE_WEB_BUDGET_MS =
  Number(process.env.CHAT_LIVE_WEB_BUDGET_MS) || 60_000;

/** Upper bound for optional fact-verification pass after live web. */
export const CHAT_VERIFICATION_BUDGET_MS =
  Number(process.env.CHAT_VERIFICATION_BUDGET_MS) || 45_000;

const PROCESSING_BUFFER_MS = 15_000;

/** Wall-clock budget once the worker marks a job as processing. */
export function chatJobProcessingBudgetMs(options?: {
  hasImageAttachment?: boolean;
}): number {
  const workerMs = options?.hasImageAttachment
    ? CHAT_WORKER_IMAGE_TIMEOUT_MS
    : CHAT_WORKER_TEXT_TIMEOUT_MS;
  return (
    workerMs +
    CHAT_LIVE_WEB_BUDGET_MS +
    CHAT_VERIFICATION_BUDGET_MS +
    PROCESSING_BUFFER_MS
  );
}

/** Client should outlive server recovery so users see the real reply, not a spinner timeout. */
export function chatClientReplyWaitMs(slowNetwork: boolean): number {
  const serverBudget = chatJobProcessingBudgetMs({ hasImageAttachment: true });
  const clientMs =
    Number(process.env.CHAT_CLIENT_REPLY_WAIT_MS) ||
    serverBudget + 30_000;
  if (slowNetwork) {
    return (
      Number(process.env.CHAT_CLIENT_REPLY_WAIT_SLOW_MS) ||
      clientMs + 45_000
    );
  }
  return clientMs;
}
