/**
 * Welcome delivery orchestration (claim → provider → mark).
 * Injectable deps for unit tests — never called with real Resend in tests.
 */

import type { SendEmailResult } from "./emailClient";
import { isAmbiguousDeliveryFailure } from "./engagementAnnouncementSafety";

export type WelcomeClaimOutcome =
  | { ok: true }
  | { ok: false; reason: string };

export type WelcomeDeliveryDeps = {
  isConfigured: () => boolean;
  claim: (email: string) => Promise<WelcomeClaimOutcome>;
  send: (email: string) => Promise<SendEmailResult>;
  markSent: (email: string) => Promise<unknown>;
  markUncertain: (email: string) => Promise<unknown>;
  markFailed: (email: string) => Promise<unknown>;
  onSkip?: (reason: string) => void;
  onSendFailed?: (reason: string) => void;
};

export type WelcomeDeliveryResult = {
  /** Whether the provider send function was invoked. */
  providerInvoked: boolean;
  /** Final bookkeeping decision. */
  outcome:
    | "skipped_unconfigured"
    | "skipped_claim"
    | "sent"
    | "uncertain"
    | "failed";
  claimReason?: string;
  sendReason?: string;
};

/**
 * Only the successful claimant invokes `send`. Ambiguous → uncertain (no auto-retry).
 * Definitive failure → failed. Does not reclaim "sending" on crash (caller must not retry).
 */
export async function runWelcomeEmailDelivery(
  email: string,
  deps: WelcomeDeliveryDeps
): Promise<WelcomeDeliveryResult> {
  if (!deps.isConfigured()) {
    return { providerInvoked: false, outcome: "skipped_unconfigured" };
  }

  const claim = await deps.claim(email);
  if (!claim.ok) {
    deps.onSkip?.(claim.reason);
    return {
      providerInvoked: false,
      outcome: "skipped_claim",
      claimReason: claim.reason,
    };
  }

  const result = await deps.send(email);
  if (result.ok) {
    await deps.markSent(email);
    return { providerInvoked: true, outcome: "sent" };
  }

  deps.onSendFailed?.(result.reason);
  if (isAmbiguousDeliveryFailure(result.reason)) {
    await deps.markUncertain(email);
    return {
      providerInvoked: true,
      outcome: "uncertain",
      sendReason: result.reason,
    };
  }

  await deps.markFailed(email);
  return {
    providerInvoked: true,
    outcome: "failed",
    sendReason: result.reason,
  };
}
