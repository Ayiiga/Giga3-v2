import { describe, expect, it, vi } from "vitest";
import { initializePaystackPayment } from "../../web/lib/payments/paystackService";

describe("initializePaystackPayment retry", () => {
  it("retries transient connection errors before succeeding", async () => {
    const runAction = vi
      .fn()
      .mockRejectedValueOnce(new Error("Connection lost while action was in flight"))
      .mockResolvedValueOnce({
        authorizationUrl: "https://checkout.paystack.com/test",
        accessCode: "code",
        reference: "ref",
        amountGhs: 10,
        label: "Mini Pack",
        mode: "live",
      });

    const result = await initializePaystackPayment(runAction, {
      sessionToken: "token",
      productId: "credits_10",
      channels: ["mobile_money"],
    });

    expect(runAction).toHaveBeenCalledTimes(2);
    expect(result.amountGhs).toBe(10);
  });

  it("does not retry non-transient errors", async () => {
    const runAction = vi.fn().mockRejectedValue(new Error("Unknown product"));

    await expect(
      initializePaystackPayment(runAction, {
        sessionToken: "token",
        productId: "bad",
      })
    ).rejects.toThrow("Unknown product");

    expect(runAction).toHaveBeenCalledTimes(1);
  });
});
