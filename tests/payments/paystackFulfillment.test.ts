import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Paystack fulfillment safety", () => {
  it("blocks subscription checkout before marking payment success", () => {
    const src = readFileSync(resolve(__dirname, "../../convex/paystack.ts"), "utf8");
    const fulfillStart = src.indexOf("export const fulfillPayment");
    expect(fulfillStart).toBeGreaterThan(-1);
    const fulfillBody = src.slice(fulfillStart, fulfillStart + 4500);

    const blockIdx = fulfillBody.indexOf("isBlockedFromNewSubscription");
    const patchIdx = fulfillBody.indexOf('status: "success"');
    expect(blockIdx).toBeGreaterThan(-1);
    expect(patchIdx).toBeGreaterThan(-1);
    expect(blockIdx).toBeLessThan(patchIdx);
  });

  it("uses relaxed amount checks for client verify and webhook", () => {
    const src = readFileSync(resolve(__dirname, "../../convex/paystack.ts"), "utf8");
    expect(src).toContain("strictAmountCheck: options?.strictAmountCheck ?? false");
    expect(src).toContain("strictAmountCheck: false");
  });

  it("allows Paystack popup on billing routes via COOP override", () => {
    const headers = readFileSync(resolve(__dirname, "../../web/public/_headers"), "utf8");
    expect(headers).toContain("/payment/*");
    expect(headers).toContain("Cross-Origin-Opener-Policy: same-origin-allow-popups");
  });

  it("success page supports retry when verification is slow", () => {
    const page = readFileSync(
      resolve(__dirname, "../../web/components/billing/PaymentSuccessPageClient.tsx"),
      "utf8"
    );
    const success = readFileSync(
      resolve(__dirname, "../../web/components/billing/PaymentSuccess.tsx"),
      "utf8"
    );
    expect(page).toContain("getPaymentByReference");
    expect(page).toContain("handleRetry");
    expect(page).toContain('phase === "pending"');
    expect(success).toContain("Check payment again");
  });
});
