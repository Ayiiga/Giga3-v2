/** Client helpers for GigaSocial creator economy eligibility and formatting. */

/**
 * Fans required before a creator may accept monetisation terms and start earning.
 * Product rule (2026-10-24 Earnings Centre brief): 500 genuine fans.
 */
export const MIN_FANS_FOR_MONETIZATION = 500;

/** Fans required before a creator may request a withdrawal (still requires acceptance + balance). */
export const MIN_FANS_FOR_WITHDRAWAL = 50;

/** @deprecated Use MIN_FANS_FOR_MONETIZATION — kept for older imports. */
export const DEFAULT_MIN_FANS_FOR_MONETIZATION = MIN_FANS_FOR_MONETIZATION;

export function formatGhs(amount: number): string {
  if (!Number.isFinite(amount)) return "GH₵ 0.00";
  return `GH₵ ${amount.toFixed(2)}`;
}

export function fanProgressPercent(fanCount: number, required: number): number {
  if (required <= 0) return 100;
  return Math.min(100, Math.round((fanCount / required) * 100));
}

export function fansRemaining(fanCount: number, required: number): number {
  return Math.max(0, required - Math.max(0, fanCount));
}

export function isEligibleForMonetization(
  fanCount: number,
  required = MIN_FANS_FOR_MONETIZATION
): boolean {
  return fanCount >= required;
}

export function isEligibleForWithdrawal(
  fanCount: number,
  required = MIN_FANS_FOR_WITHDRAWAL
): boolean {
  return fanCount >= required;
}

/** True only when the server reports current-policy acceptance — never fan count alone. */
export function isCreatorMonetizationUnlocked(
  _fanCount: number,
  unlocked?: boolean,
  _required = MIN_FANS_FOR_MONETIZATION
): boolean {
  return Boolean(unlocked);
}

export function monetizationStatusMessage(args: {
  fanCount: number;
  fansRequired: number;
  withdrawalFansRequired: number;
  accepted: boolean;
  requiresPolicyReacceptance?: boolean;
}): string {
  const {
    fanCount,
    fansRequired,
    withdrawalFansRequired,
    accepted,
    requiresPolicyReacceptance,
  } = args;
  if (!isEligibleForMonetization(fanCount, fansRequired)) {
    const n = fansRemaining(fanCount, fansRequired);
    return `Invite ${n} more ${n === 1 ? "fan" : "fans"} to unlock creator monetisation (need ${fansRequired}).`;
  }
  if (!accepted) {
    if (requiresPolicyReacceptance) {
      return "Please accept the current creator monetisation rules to continue earning and withdraw.";
    }
    return "You are eligible to apply. Accept the creator rules and submit your application.";
  }
  if (!isEligibleForWithdrawal(fanCount, withdrawalFansRequired)) {
    const n = fansRemaining(fanCount, withdrawalFansRequired);
    return `You can start requesting withdrawals once you reach ${withdrawalFansRequired} fans (${n} to go).`;
  }
  return "You meet fan eligibility for withdrawals. Available balance and payment checks still apply.";
}
