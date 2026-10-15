/**
 * Pure helpers for marketplace storefront + sales analytics completeness.
 * Kept free of Convex runtime so vitest can cover >200-purchase and mixed-status cases.
 */

export const STOREFRONT_DEFAULT_LIMIT = 48;
export const STOREFRONT_MAX_LIMIT = 80;

/** Clamp a client-requested storefront page size to a positive, bounded maximum. */
export function clampStorefrontLimit(limit?: number): number {
  const raw = limit === undefined || limit === null ? STOREFRONT_DEFAULT_LIMIT : Number(limit);
  if (!Number.isFinite(raw)) return STOREFRONT_DEFAULT_LIMIT;
  const n = Math.floor(raw);
  if (n < 1) return 1;
  return Math.min(n, STOREFRONT_MAX_LIMIT);
}

type StatusListing = { status: string };

/**
 * Walk creator listing rows (newest-first) and keep only published + approved
 * products up to `cap`. Drafts/archived never fill the result — callers must
 * supply either a published-only index stream or a full creator listing set.
 */
export function pickEligibleStorefrontListings<T extends StatusListing>(
  rows: T[],
  cap: number,
  isApproved: (row: T) => boolean
): T[] {
  const limit = clampStorefrontLimit(cap);
  const out: T[] = [];
  for (const row of rows) {
    if (row.status !== "published") continue;
    if (!isApproved(row)) continue;
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

export type PurchaseSaleRow = {
  amountGhs: number;
  platformFeeGhs: number;
  creatorEarningsGhs: number;
  createdAt: number;
  listingId: string;
};

/** Inclusive date-range filter used by seller analytics. */
export function filterPurchasesInRange<T extends { createdAt: number }>(
  sales: T[],
  fromMs: number,
  toMs: number
): T[] {
  return sales.filter((sale) => sale.createdAt >= fromMs && sale.createdAt <= toMs);
}

/** Aggregate every matching purchase — never truncate financial totals. */
export function aggregatePurchaseTotals(sales: PurchaseSaleRow[]): {
  grossSalesGhs: number;
  purchaseCount: number;
  platformFeesGhs: number;
  creatorEarningsGhs: number;
} {
  let grossSalesGhs = 0;
  let platformFeesGhs = 0;
  let creatorEarningsGhs = 0;
  for (const sale of sales) {
    grossSalesGhs += sale.amountGhs;
    platformFeesGhs += sale.platformFeeGhs;
    creatorEarningsGhs += sale.creatorEarningsGhs;
  }
  return {
    grossSalesGhs,
    purchaseCount: sales.length,
    platformFeesGhs,
    creatorEarningsGhs,
  };
}

/** Seller-dashboard profile slice — strips national ID, docs, and GPS. */
export function toSellerRevenueProfile(profile: {
  displayName: string;
  handle: string;
  bio?: string;
  avatarUrl?: string;
  website?: string;
  verified: boolean;
  verificationStatus?: "none" | "pending" | "approved" | "rejected";
  totalSales: number;
  totalEarningsGhs: number;
  payoutBalanceGhs: number;
  createdAt: number;
  updatedAt: number;
  nationalIdNumber?: string;
  idDocumentStorageId?: unknown;
  idDocumentFileName?: string;
  latitude?: number;
  longitude?: number;
  locationCapturedAt?: number;
  locationAccuracyMeters?: number;
  verificationSubmittedAt?: number;
  verificationReviewedAt?: number;
  verificationRejectionReason?: string;
  userId?: string;
}) {
  return {
    displayName: profile.displayName,
    handle: profile.handle,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    website: profile.website,
    verified: profile.verified,
    verificationStatus: profile.verificationStatus,
    totalSales: profile.totalSales,
    totalEarningsGhs: profile.totalEarningsGhs,
    payoutBalanceGhs: profile.payoutBalanceGhs,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}
