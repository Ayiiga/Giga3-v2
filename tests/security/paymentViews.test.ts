import { describe, expect, it } from "vitest";
import { toClientPaymentView } from "../../convex/paymentViews";

describe("paymentViews", () => {
  it("strips PII and raw Paystack payloads from client payment views", () => {
    const view = toClientPaymentView({
      _id: "payments:1" as any,
      _creationTime: 0,
      userId: "buyer@example.com",
      provider: "paystack",
      reference: "giga3_test_ref",
      productId: "credits_100",
      type: "credits",
      amountGhs: 25,
      creditsGranted: 100,
      status: "success",
      paystackResponse: JSON.stringify({ customer: { email: "buyer@example.com" } }),
      createdAt: 1_700_000_000_000,
    });

    expect(view.reference).toBe("giga3_test_ref");
    expect(view.status).toBe("success");
    expect(view.creditsGranted).toBe(100);
    expect(view).not.toHaveProperty("userId");
    expect(view).not.toHaveProperty("paystackResponse");
  });
});
