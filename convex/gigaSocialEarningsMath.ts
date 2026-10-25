/**
 * Pure earnings maths for GigaSocial Creator Earnings Centre.
 * Keep withdrawable cash and display totals non-overlapping.
 */

/** Paystack tip gifts (paymentReference set) + Marketplace purchase creator share — no double count. */
export function computeVerifiedCashEarningsGhs(args: {
  paystackGiftEarningsGhs: number;
  marketplacePurchaseEarningsGhs: number;
}): number {
  const tips = Number.isFinite(args.paystackGiftEarningsGhs)
    ? Math.max(0, args.paystackGiftEarningsGhs)
    : 0;
  const marketplace = Number.isFinite(args.marketplacePurchaseEarningsGhs)
    ? Math.max(0, args.marketplacePurchaseEarningsGhs)
    : 0;
  return Math.round((tips + marketplace) * 100) / 100;
}

/** Credit tips only — exclude platform-credit gifts without Paystack reference. */
export function sumPaystackGiftEarningsGhs(
  gifts: ReadonlyArray<{ amountGhs: number; paymentReference?: string | null }>
): number {
  let sum = 0;
  for (const g of gifts) {
    if (!g.paymentReference?.trim()) continue;
    if (!Number.isFinite(g.amountGhs) || g.amountGhs <= 0) continue;
    sum += g.amountGhs;
  }
  return Math.round(sum * 100) / 100;
}
