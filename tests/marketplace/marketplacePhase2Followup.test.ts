import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  aggregatePurchaseTotals,
  clampStorefrontLimit,
  filterPurchasesInRange,
  pickEligibleStorefrontListings,
  toSellerRevenueProfile,
} from "../../convex/marketplaceCompleteness";
import { CREATOR_SERIES, CREATOR_SERIES_PRICE_GHS } from "../../web/lib/marketplace/creatorSeries";

const marketplaceSrc = readFileSync(
  resolve(__dirname, "../../convex/marketplace.ts"),
  "utf8"
);
const schemaSrc = readFileSync(resolve(__dirname, "../../convex/schema.ts"), "utf8");

function makePurchases(count: number, startAt = 1_000) {
  return Array.from({ length: count }, (_, i) => ({
    listingId: `listing-${i % 5}`,
    amountGhs: 10,
    platformFeeGhs: 2,
    creatorEarningsGhs: 8,
    createdAt: startAt + i,
  }));
}

describe("marketplace follow-up — sales analytics completeness", () => {
  it("aggregates more than 200 purchases without truncation", () => {
    const sales = makePurchases(250);
    const totals = aggregatePurchaseTotals(sales);
    expect(totals.purchaseCount).toBe(250);
    expect(totals.grossSalesGhs).toBe(2500);
    expect(totals.platformFeesGhs).toBe(500);
    expect(totals.creatorEarningsGhs).toBe(2000);
  });

  it("honours inclusive date boundaries and all-time totals", () => {
    const sales = makePurchases(250, 1_000);
    const windowed = filterPurchasesInRange(sales, 1_050, 1_149);
    expect(windowed).toHaveLength(100);
    expect(aggregatePurchaseTotals(windowed).grossSalesGhs).toBe(1000);

    const boundary = filterPurchasesInRange(sales, 1_000, 1_000);
    expect(boundary).toHaveLength(1);

    const allTime = filterPurchasesInRange(sales, 0, Number.MAX_SAFE_INTEGER);
    expect(aggregatePurchaseTotals(allTime).purchaseCount).toBe(250);
  });

  it("getCreatorSalesAnalytics uses indexed range collect, not take(200)", () => {
    const block =
      marketplaceSrc.match(
        /export const getCreatorSalesAnalytics = query\([\s\S]*?\n}\);/
      )?.[0] ?? "";
    expect(block).toContain('.gte("createdAt", fromMs)');
    expect(block).toContain('.lte("createdAt", toMs)');
    expect(block).toContain(".collect()");
    expect(block).not.toMatch(/\.take\(\s*200\s*\)/);
    expect(block).toContain("eq(\"creatorId\", email)");
    expect(block).toContain("refundsSupported: false");
    expect(block).toContain("automatedPayouts: false");
  });
});

describe("marketplace follow-up — storefront completeness", () => {
  it("clamps storefront limit to a positive reasonable maximum", () => {
    expect(clampStorefrontLimit(undefined)).toBe(48);
    expect(clampStorefrontLimit(0)).toBe(1);
    expect(clampStorefrontLimit(-5)).toBe(1);
    expect(clampStorefrontLimit(12.9)).toBe(12);
    expect(clampStorefrontLimit(999)).toBe(80);
  });

  it("keeps published approved products when drafts/archived dominate the stream", () => {
    const rows = [
      ...Array.from({ length: 150 }, (_, i) => ({
        id: `draft-${i}`,
        status: "draft" as const,
        approved: true,
      })),
      ...Array.from({ length: 40 }, (_, i) => ({
        id: `arch-${i}`,
        status: "archived" as const,
        approved: true,
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `pub-${i}`,
        status: "published" as const,
        approved: true,
      })),
      {
        id: "pub-pending",
        status: "published" as const,
        approved: false,
      },
    ];

    // Simulate published-only index: drafts/archived never appear.
    const publishedOnly = rows.filter((r) => r.status === "published");
    const picked = pickEligibleStorefrontListings(
      publishedOnly,
      48,
      (row) => row.approved
    );
    expect(picked.map((r) => r.id)).toEqual([
      "pub-0",
      "pub-1",
      "pub-2",
      "pub-3",
      "pub-4",
    ]);
  });

  it("still finds eligible products when mixed with drafts in a full creator scan", () => {
    const mixed = [
      ...Array.from({ length: 200 }, (_, i) => ({
        id: `d-${i}`,
        status: "draft" as const,
        approved: true,
      })),
      { id: "keep-a", status: "published" as const, approved: true },
      { id: "keep-b", status: "published" as const, approved: true },
      { id: "reject", status: "published" as const, approved: false },
    ];
    const picked = pickEligibleStorefrontListings(mixed, 10, (r) => r.approved);
    expect(picked.map((r) => r.id)).toEqual(["keep-a", "keep-b"]);
  });

  it("listPublishedByHandle uses by_creator_status + public views", () => {
    expect(schemaSrc).toContain('by_creator_status"');
    const block =
      marketplaceSrc.match(/export const listPublishedByHandle = query\([\s\S]*?\n}\);/)?.[0] ??
      "";
    expect(block).toContain("by_creator_status");
    expect(block).toContain('eq("status", "published")');
    expect(block).toContain("clampStorefrontLimit");
    expect(block).toContain("pickEligibleStorefrontListings");
    expect(block).toContain("toPublicListing(listing)");
    expect(block).toContain("toPublicCreatorProfile(profile)");
    expect(block).not.toMatch(/\.take\(\s*120\s*\)/);
    expect(block).not.toContain("nationalId");
    expect(block).not.toContain("fileStorageId");
  });
});

describe("marketplace follow-up — seller revenue profile minimization", () => {
  it("strips national ID, document storage, and location fields", () => {
    const minimized = toSellerRevenueProfile({
      displayName: "Ada",
      handle: "ada",
      bio: "hi",
      verified: true,
      verificationStatus: "approved",
      totalSales: 3,
      totalEarningsGhs: 100,
      payoutBalanceGhs: 80,
      createdAt: 1,
      updatedAt: 2,
      nationalIdNumber: "GHA-SECRET",
      idDocumentStorageId: "storage:secret",
      idDocumentFileName: "id.pdf",
      latitude: 5.6,
      longitude: -0.2,
      locationCapturedAt: 9,
      locationAccuracyMeters: 12,
      verificationSubmittedAt: 3,
      verificationReviewedAt: 4,
      verificationRejectionReason: "n/a",
      userId: "seller@example.com",
    });

    expect(minimized.payoutBalanceGhs).toBe(80);
    expect(minimized.handle).toBe("ada");
    expect(minimized).not.toHaveProperty("nationalIdNumber");
    expect(minimized).not.toHaveProperty("idDocumentStorageId");
    expect(minimized).not.toHaveProperty("idDocumentFileName");
    expect(minimized).not.toHaveProperty("latitude");
    expect(minimized).not.toHaveProperty("longitude");
    expect(minimized).not.toHaveProperty("userId");
    expect(minimized).not.toHaveProperty("locationCapturedAt");
    expect(minimized).not.toHaveProperty("verificationRejectionReason");
  });

  it("getCreatorRevenue returns toSellerRevenueProfile", () => {
    const block =
      marketplaceSrc.match(/export const getCreatorRevenue = query\([\s\S]*?\n}\);/)?.[0] ?? "";
    expect(block).toContain("toSellerRevenueProfile(profile)");
    expect(block).not.toMatch(/profile,\s*\n\s*payouts/);
    expect(block).not.toMatch(/buyerId:\s*sale\.buyerId/);
  });
});

describe("marketplace follow-up — preservation", () => {
  it("keeps Creator Academy four eBooks at GHS 150", () => {
    expect(CREATOR_SERIES).toHaveLength(4);
    expect(CREATOR_SERIES_PRICE_GHS).toBe(150);
  });

  it("does not alter Paystack fulfillment or download gate modules", () => {
    const payments = readFileSync(
      resolve(__dirname, "../../convex/marketplacePayments.ts"),
      "utf8"
    );
    expect(payments).toContain("fulfillMarketplacePurchaseInternal");
    expect(payments).toContain("alreadyFulfilled");
    expect(marketplaceSrc).toContain("export const getDownloadAccess = query");
    expect(marketplaceSrc).toMatch(
      /if \(!isCreator && !purchased\) return \{ allowed: false as const \}/
    );
  });
});
