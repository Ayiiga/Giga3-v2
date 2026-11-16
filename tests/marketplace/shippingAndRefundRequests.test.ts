import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validatePhysicalShipping } from "../../convex/marketplaceShippingPolicy";

const source = (file: string) => readFileSync(resolve(__dirname, "../../", file), "utf8");

describe("Marketplace shipping and refunds: no unverified paid physical orders", () => {
  it("supports collection, local delivery and courier with sane fee/delay/return limits", () => {
    expect(() => validatePhysicalShipping({ methods: ["pickup", "courier"], feeGhs: 25, days: 3, returnWindowDays: 7 })).not.toThrow();
    expect(() => validatePhysicalShipping({ methods: ["courier", "courier"] })).toThrow();
    expect(() => validatePhysicalShipping({ methods: [], feeGhs: 10 })).toThrow();
    expect(() => validatePhysicalShipping({ methods: ["pickup"], feeGhs: -1 })).toThrow();
    expect(() => validatePhysicalShipping({ methods: ["courier"], feeGhs: 10001 })).toThrow();
    expect(() => validatePhysicalShipping({ methods: ["courier"], days: 0 })).toThrow();
    expect(() => validatePhysicalShipping({ methods: ["courier"], days: 61 })).toThrow();
    expect(() => validatePhysicalShipping({ methods: ["pickup"], returnWindowDays: 91 })).toThrow();
  });

  it("preserves a hard distinction between physical enquiries and digital Paystack", () => {
    const market = source("convex/marketplace.ts");
    const helpers = source("convex/marketplaceListingHelpers.ts");
    const paystack = source("convex/paystack.ts");
    expect(market).toContain('isPhysicalMarketplaceListing(listing)) return null');
    expect(market).toContain('isPhysicalMarketplaceListing(listing)) return { allowed: false');
    expect(helpers).toContain('if (isPhysicalMarketplaceListing(listing)) return false');
    expect(paystack).toContain('type: "marketplace"');
    expect(paystack).not.toContain('type: "physical_order"');
    expect(source("convex/marketplacePhysicalInquiries.ts")).toContain('A collection request cannot include a shipping charge.');
  });

  it("shipping quote is a private inquiry, not a paid order", () => {
    const inquiries = source("convex/marketplacePhysicalInquiries.ts");
    expect(inquiries).toContain("requestedShippingMethod");
    expect(inquiries).toContain("destinationCity");
    expect(inquiries).toContain("quotedShippingFeeGhs");
    expect(inquiries).toContain("getMyInquiryForListing");
    expect(inquiries).not.toContain("paystack");
  });

  it("refunds require a verified paid purchase and never claim money returned", () => {
    const refunds = source("convex/marketplaceRefundRequests.ts");
    const schema = source("convex/schema.ts");
    expect(refunds).toContain('payment.status !== "success"');
    expect(refunds).toContain('payment.type !== "marketplace"');
    expect(refunds).toContain('purchase.buyerId !== buyerId');
    expect(refunds).toContain('withIndex("by_purchase"');
    expect(refunds).toContain('No refund has been issued yet');
    expect(refunds).not.toContain("paystackPost");
    expect(schema).toContain("marketplaceRefundRequests: defineTable");
    expect(source("web/components/marketplace/MarketplacePurchasesClient.tsx")).toContain("Request refund review");
    expect(source("web/components/admin/AdminDashboardClient.tsx")).toContain("DOES NOT issue, confirm or complete a refund");
  });
});
