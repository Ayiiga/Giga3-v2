/**
 * Pure monetisation consent + withdrawal amount helpers (no Convex runtime deps).
 * Used by gigaSocialEconomy mutations and unit tests.
 */

export const CREATOR_MONETIZATION_POLICY_VERSION = "giga-creator-monetisation-v1";

export type MonetizationConsentRecord = {
  monetizationAcceptedAt?: number;
  monetizationPolicyVersion?: string;
  monetizationAcceptedBy?: string;
  /** Legacy auto-unlock — never sufficient for current-policy consent. */
  monetizationUnlockedAt?: number;
};

/**
 * Explicit consent for the current monetisation policy.
 * Legacy monetizationUnlockedAt alone is NEVER valid consent.
 */
export function hasValidMonetizationConsent(
  economy: MonetizationConsentRecord | null | undefined,
  expectedCreatorId: string
): boolean {
  if (!economy || !expectedCreatorId?.trim()) return false;
  const acceptedAt = economy.monetizationAcceptedAt;
  if (typeof acceptedAt !== "number" || !Number.isFinite(acceptedAt) || acceptedAt <= 0) {
    return false;
  }
  if (economy.monetizationPolicyVersion !== CREATOR_MONETIZATION_POLICY_VERSION) {
    return false;
  }
  const acceptedBy = economy.monetizationAcceptedBy?.trim().toLowerCase();
  const expected = expectedCreatorId.trim().toLowerCase();
  if (!acceptedBy || acceptedBy !== expected) {
    return false;
  }
  return true;
}

export type WithdrawalAmountValidation =
  | { ok: true; amountGhs: number }
  | { ok: false; error: string };

/**
 * Validate a withdrawal amount before mutating balances.
 * Product amounts are whole GHS; reject non-finite / non-positive / sub-min / over-balance.
 */
export function validateWithdrawalAmountGhs(args: {
  rawAmount: number;
  availableBalanceGhs: number;
  minWithdrawalGhs: number;
  maxWithdrawalGhs?: number;
}): WithdrawalAmountValidation {
  const { rawAmount, availableBalanceGhs, minWithdrawalGhs, maxWithdrawalGhs } = args;

  if (typeof rawAmount !== "number" || !Number.isFinite(rawAmount)) {
    return { ok: false, error: "Invalid withdrawal amount." };
  }
  if (rawAmount <= 0) {
    return { ok: false, error: "Withdrawal amount must be greater than zero." };
  }
  // Whole GHS only — reject fractional values before rounding hides them.
  if (!Number.isInteger(rawAmount)) {
    return { ok: false, error: "Withdrawal amount must be a whole GHS value." };
  }

  const amountGhs = rawAmount;
  if (typeof availableBalanceGhs !== "number" || !Number.isFinite(availableBalanceGhs)) {
    return { ok: false, error: "Withdrawable balance unavailable." };
  }
  if (availableBalanceGhs < 0) {
    return { ok: false, error: "Withdrawable balance unavailable." };
  }
  if (amountGhs < minWithdrawalGhs) {
    return { ok: false, error: `Minimum withdrawal is GHS ${minWithdrawalGhs}.` };
  }
  if (amountGhs > availableBalanceGhs) {
    return { ok: false, error: "Insufficient withdrawable balance." };
  }
  if (
    typeof maxWithdrawalGhs === "number" &&
    Number.isFinite(maxWithdrawalGhs) &&
    amountGhs > maxWithdrawalGhs
  ) {
    return { ok: false, error: `Maximum withdrawal is GHS ${maxWithdrawalGhs}.` };
  }

  return { ok: true, amountGhs };
}
