/**
 * Release-readiness audit: marketplace download authorization + Paystack
 * marketplace fulfillment wiring (source-level; no live credentials).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isListingFileApproved,
  listingFileReviewLabel,
} from "../../convex/marketplaceListingHelpers";

const marketplaceSrc = readFileSync(
  resolve(__dirname, "../../convex/marketplace.ts"),
  "utf8"
);
const paystackSrc = readFileSync(resolve(__dirname, "../../convex/paystack.ts"), "utf8");
const paymentsSrc = readFileSync(
  resolve(__dirname, "../../convex/marketplacePayments.ts"),
  "utf8"
);
const sellSrc = readFileSync(
  resolve(__dirname, "../../web/components/marketplace/MarketplaceSellClient.tsx"),
  "utf8"
);
const creatorSrc = readFileSync(
  resolve(__dirname, "../../convex/creatorProfiles.ts"),
  "utf8"
);

function sliceExport(src: string, exportName: string, length = 2500): string {
  const idx = src.indexOf(`export const ${exportName}`);
  expect(idx).toBeGreaterThan(-1);
  return src.slice(idx, idx + length);
}

describe("release audit: isListingFileApproved helpers", () => {
  it("rejects pending community files and allows official series", () => {
    expect(
      isListingFileApproved({
        tags: ["ebook"],
        fileStorageId: "s1" as any,
        fileReviewStatus: "pending",
      })
    ).toBe(false);
    expect(
      isListingFileApproved({
        tags: ["giga3-official-series"],
        fileStorageId: "s1" as any,
        fileReviewStatus: "pending",
      })
    ).toBe(true);
    expect(
      listingFileReviewLabel({
        tags: ["ebook"],
        fileStorageId: "s1" as any,
        fileReviewStatus: "rejected",
      })
    ).toBe("rejected");
  });
});

describe("release audit: getDownloadAccess authorization", () => {
  it("requires session + purchase or creator ownership before URL", () => {
    const body = sliceExport(marketplaceSrc, "getDownloadAccess", 1800);
    expect(body).toContain("requireSession(args.sessionToken, ctx)");
    expect(body).toContain("listing.creatorId === email");
    expect(body).toContain("purchases.some((p) => p.listingId === args.listingId)");
    expect(body).toContain('if (!isCreator && !purchased) return { allowed: false');
  });

  it("blocks non-creator buyers when file is not approved", () => {
    const body = sliceExport(marketplaceSrc, "getDownloadAccess", 1800);
    expect(body).toContain("!isCreator && !isListingFileApproved(listing)");
    expect(body).toContain('reason: "file_pending_review"');
  });

  it("never returns storage URL without ownership gate", () => {
    const body = sliceExport(marketplaceSrc, "getDownloadAccess", 1800);
    const deniedIdx = body.indexOf("!isCreator && !purchased");
    const urlIdx = body.indexOf("ctx.storage.getUrl");
    expect(deniedIdx).toBeGreaterThan(-1);
    expect(urlIdx).toBeGreaterThan(deniedIdx);
  });
});

describe("release audit: getMyPurchases download gate", () => {
  it("only attaches downloadUrl when isListingFileApproved", () => {
    const body = sliceExport(marketplaceSrc, "getMyPurchases", 1600);
    expect(body).toContain("isListingFileApproved(listing)");
    expect(body).toContain("downloadPendingReview");
    expect(body).toMatch(
      /if \(listing\.fileStorageId && isListingFileApproved\(listing\)\)[\s\S]*getUrl/
    );
  });
});

describe("release audit: Paystack marketplace fulfillment path", () => {
  it("checkout refuses unready / duplicate / self purchases", () => {
    const body = sliceExport(paystackSrc, "initializeMarketplacePayment", 2200);
    expect(body).toContain("assertPaystackProductionReady");
    expect(body).toContain("You cannot purchase your own listing");
    expect(body).toContain("!listing.purchaseReady");
    expect(body).toContain("isListingPurchasedInternal");
    expect(body).toContain("You already own this product");
  });

  it("fulfillPayment routes marketplace type to fulfillMarketplacePurchaseInternal", () => {
    const body = sliceExport(paystackSrc, "fulfillPayment", 4500);
    expect(body).toContain('record.type === "marketplace"');
    expect(body).toContain("fulfillMarketplacePurchaseInternal");
    expect(body).toContain("validatePaymentAmount");
  });

  it("marketplace purchase insert is idempotent on reference and buyer ownership", () => {
    expect(paymentsSrc).toContain("by_reference");
    expect(paymentsSrc).toContain("alreadyFulfilled: true");
    expect(paymentsSrc).toContain("buyerPurchases.some((p) => p.listingId === args.listingId)");
  });

  it("webhook verifies HMAC signature before fulfillment", () => {
    expect(paystackSrc).toContain("verifyPaystackSignature");
    expect(paystackSrc).toContain("x-paystack-signature");
    const webhookIdx = paystackSrc.indexOf("export const paystackWebhook");
    const webhook = paystackSrc.slice(webhookIdx, webhookIdx + 1200);
    const sigIdx = webhook.indexOf("verifyPaystackSignature");
    const fulfillIdx = webhook.indexOf("processWebhookPayload");
    expect(sigIdx).toBeGreaterThan(-1);
    expect(fulfillIdx).toBeGreaterThan(sigIdx);
    expect(webhook).toContain("Invalid signature");
  });
});

describe("release audit: identity verification UI vs backend", () => {
  it("submit path auto-approves only after evaluateCreatorVerification succeeds", () => {
    const body = sliceExport(creatorSrc, "submitCreatorVerification", 3200);
    expect(body).toContain("evaluateCreatorVerification");
    expect(body).toContain("if (!autoCheck.ok)");
    expect(body).toContain("throw new Error(autoCheck.reason)");
    // Successful patch to approved must come after the autoCheck gate.
    const failGateIdx = body.indexOf("if (!autoCheck.ok)");
    const patchApprovedIdx = body.indexOf("verificationStatus: \"approved\",\n      verified: true");
    expect(failGateIdx).toBeGreaterThan(-1);
    expect(patchApprovedIdx).toBeGreaterThan(failGateIdx);
  });

  it("sell UI pending/rejected copy offers support path and no fake verified claim", () => {
    expect(sellSrc).toContain("Incomplete — resubmit required");
    expect(sellSrc).toContain("support@giga3ai.com");
    expect(sellSrc).toContain("never mark creators verified without a successful server-side check");
    expect(sellSrc).not.toContain("Status: Pending review");
    // Must not show contradictory “pending review” + “failed” together as success
    expect(sellSrc).not.toMatch(/Status:\s*Verified[\s\S]{0,80}Automatic verification did not finish/);
  });
});
