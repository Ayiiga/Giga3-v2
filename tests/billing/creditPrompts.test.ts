import { describe, expect, it } from "vitest";
import {
  CHAT_CREDIT_COST,
  creditBalancePrompt,
  creditPromptMessage,
  isBillingRelatedError,
  isInsufficientCreditsMessage,
  LOW_CREDIT_THRESHOLD,
} from "@/lib/billing/creditPrompts";

describe("creditBalancePrompt", () => {
  it("returns empty when below chat cost", () => {
    expect(creditBalancePrompt(0)).toBe("empty");
    expect(creditBalancePrompt(CHAT_CREDIT_COST - 1)).toBe("empty");
  });

  it("returns low within threshold", () => {
    expect(creditBalancePrompt(LOW_CREDIT_THRESHOLD)).toBe("low");
    expect(creditBalancePrompt(CHAT_CREDIT_COST)).toBe("low");
  });

  it("returns null when balance is healthy", () => {
    expect(creditBalancePrompt(LOW_CREDIT_THRESHOLD + 1)).toBeNull();
    expect(creditBalancePrompt(null)).toBeNull();
  });
});

describe("isBillingRelatedError", () => {
  it("detects credit and token errors", () => {
    expect(
      isBillingRelatedError(
        "Insufficient credits (2 required, 0 available). Subscribe or renew to refill."
      )
    ).toBe(true);
    expect(isBillingRelatedError("Insufficient tokens (need 8 for video)")).toBe(true);
    expect(isBillingRelatedError("Network timeout")).toBe(false);
  });
});

describe("isInsufficientCreditsMessage", () => {
  it("matches server copy", () => {
    expect(
      isInsufficientCreditsMessage("Insufficient credits (1 required, 0 available).")
    ).toBe(true);
  });
});

describe("creditPromptMessage", () => {
  it("covers proactive variants", () => {
    expect(creditPromptMessage({ variant: "empty", creditCost: 1 })).toMatch(/out of credits/i);
    expect(creditPromptMessage({ variant: "low", credits: 3 })).toMatch(/3 credits left/i);
    expect(creditPromptMessage({ variant: "subscribe" })).toMatch(/Giga3 Pro/i);
  });
});
