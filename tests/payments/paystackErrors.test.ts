import { describe, expect, it } from "vitest";
import {
  friendlyPaystackError,
  unwrapConvexErrorMessage,
} from "../../web/lib/payments/paystackErrors";

const CONVEX_WRAPPED =
  "[CONVEX A(paystack:initializePayment)] [Request ID: 8f3a1c2b9d0e4f5a] Server Error\n" +
  "Uncaught Error: This account already has grandfathered access and cannot purchase a new subscription.\n" +
  "    at handler (../../convex/paystack.ts:498:22)";

describe("unwrapConvexErrorMessage", () => {
  it("extracts the thrown message from a Convex action error envelope", () => {
    expect(unwrapConvexErrorMessage(CONVEX_WRAPPED)).toBe(
      "This account already has grandfathered access and cannot purchase a new subscription."
    );
  });

  it("strips the envelope when there is no Uncaught Error line", () => {
    expect(
      unwrapConvexErrorMessage(
        "[CONVEX A(paystack:initializePayment)] [Request ID: abc] Server Error Paystack request failed"
      )
    ).toBe("Paystack request failed");
  });

  it("falls back to the raw string when stripping leaves nothing", () => {
    const envelopeOnly = "[CONVEX A(paystack:initializePayment)] [Request ID: abc] Server Error";
    expect(unwrapConvexErrorMessage(envelopeOnly)).toBe(envelopeOnly);
  });

  it("returns plain messages untouched", () => {
    expect(unwrapConvexErrorMessage("Payment cancelled")).toBe("Payment cancelled");
  });
});

describe("friendlyPaystackError", () => {
  it("shows the real server reason instead of a generic fallback", () => {
    const msg = friendlyPaystackError(new Error(CONVEX_WRAPPED));
    expect(msg).not.toBe("Payment failed. Please try again.");
    expect(msg).toContain("grandfathered access");
  });

  it("maps configuration problems to a support-friendly message", () => {
    expect(
      friendlyPaystackError(
        new Error(
          "[CONVEX A(paystack:initializePayment)] [Request ID: x] Server Error\nUncaught Error: PAYSTACK_SECRET_KEY is not configured"
        )
      )
    ).toBe("Payments are temporarily unavailable. Please try again later.");
  });

  it("maps missing email to an actionable message", () => {
    expect(
      friendlyPaystackError(new Error("Uncaught Error: A valid email is required for checkout"))
    ).toBe("Add a valid email to your account before checking out.");
  });

  it("keeps short raw messages and falls back only for very long ones", () => {
    expect(friendlyPaystackError("Insufficient funds")).toBe("Insufficient funds");
    expect(friendlyPaystackError("x".repeat(200))).toBe("Payment failed. Please try again.");
    expect(friendlyPaystackError(undefined)).toBe(
      "Payment could not be started. Please try again."
    );
  });
});
