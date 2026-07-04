/** Internal platform take on billing — not exposed in client payment views. */

const BILLING_FEE_TYPES = new Set([
  "subscription",
  "credits",
  "video_subscription",
  "video_credits",
]);

export function getPlatformFeePercent(): number {
  const raw = process.env.GIGA3_PLATFORM_FEE_PERCENT;
  if (!raw) return 20;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 20;
}

export function appliesPlatformFee(paymentType: string): boolean {
  return BILLING_FEE_TYPES.has(paymentType);
}

export function computePlatformFeeGhs(amountGhs: number): number {
  if (amountGhs <= 0) return 0;
  return Math.round((amountGhs * getPlatformFeePercent()) / 100);
}
