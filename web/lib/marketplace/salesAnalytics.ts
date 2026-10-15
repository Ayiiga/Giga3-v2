/**
 * Pure helpers for seller sales analytics (Phase 2).
 * marketplacePurchases rows represent successful Paystack fulfilments only.
 */

export type SaleRow = {
  amountGhs: number;
  platformFeeGhs: number;
  creatorEarningsGhs: number;
  createdAt: number;
  listingId: string;
};

export type SalesSummary = {
  grossSalesGhs: number;
  purchaseCount: number;
  platformFeesGhs: number;
  creatorEarningsGhs: number;
};

export function filterSalesByRange(
  sales: SaleRow[],
  fromMs?: number,
  toMs?: number
): SaleRow[] {
  const from = fromMs ?? 0;
  const to = toMs ?? Number.MAX_SAFE_INTEGER;
  return sales.filter((s) => s.createdAt >= from && s.createdAt <= to);
}

export function summarizeSales(sales: SaleRow[]): SalesSummary {
  return sales.reduce<SalesSummary>(
    (acc, sale) => {
      acc.grossSalesGhs += sale.amountGhs;
      acc.platformFeesGhs += sale.platformFeeGhs;
      acc.creatorEarningsGhs += sale.creatorEarningsGhs;
      acc.purchaseCount += 1;
      return acc;
    },
    { grossSalesGhs: 0, purchaseCount: 0, platformFeesGhs: 0, creatorEarningsGhs: 0 }
  );
}

export function productSalesSummaries(
  sales: SaleRow[]
): Array<{
  listingId: string;
  purchaseCount: number;
  grossGhs: number;
  feesGhs: number;
  earningsGhs: number;
}> {
  const map = new Map<
    string,
    { listingId: string; purchaseCount: number; grossGhs: number; feesGhs: number; earningsGhs: number }
  >();
  for (const sale of sales) {
    const row = map.get(sale.listingId) ?? {
      listingId: sale.listingId,
      purchaseCount: 0,
      grossGhs: 0,
      feesGhs: 0,
      earningsGhs: 0,
    };
    row.purchaseCount += 1;
    row.grossGhs += sale.amountGhs;
    row.feesGhs += sale.platformFeeGhs;
    row.earningsGhs += sale.creatorEarningsGhs;
    map.set(sale.listingId, row);
  }
  return [...map.values()].sort((a, b) => b.grossGhs - a.grossGhs);
}

/** Date presets for the seller analytics UI (local calendar days). */
export function analyticsRangePreset(
  preset: "7d" | "30d" | "90d" | "all"
): { fromMs?: number; toMs?: number } {
  if (preset === "all") return {};
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  const toMs = Date.now();
  const fromMs = toMs - days * 24 * 60 * 60 * 1000;
  return { fromMs, toMs };
}
