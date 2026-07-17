/** Client helpers for GigaSocial creator economy unlock and formatting. */

export const DEFAULT_MIN_FANS_FOR_MONETIZATION = 500;

export function formatGhs(amount: number): string {
  if (!Number.isFinite(amount)) return "GHC 0.00";
  return `GHC ${amount.toFixed(2)}`;
}

export function fanProgressPercent(fanCount: number, required = DEFAULT_MIN_FANS_FOR_MONETIZATION): number {
  if (required <= 0) return 100;
  return Math.min(100, Math.round((fanCount / required) * 100));
}

export function isCreatorMonetizationUnlocked(
  fanCount: number,
  unlocked?: boolean,
  required = DEFAULT_MIN_FANS_FOR_MONETIZATION
): boolean {
  if (unlocked) return true;
  return fanCount >= required;
}
