import { describe, expect, it } from "vitest";
import {
  CHAT_CREDIT_COST,
  creditBalancePrompt,
  creditPromptMessage,
  isBillingRelatedError,
  isInsufficientCreditsMessage,
  LOW_CREDIT_THRESHOLD,
} from "@/lib/billing/creditPrompts";
import { CREDIT_COSTS } from "@/lib/credits/constants";

describe("creditBalancePrompt", () => {
  it("never treats ordinary chat as requiring a per-message credit floor", () => {
    // Zero balance soft-upsells premium tools; it must not return "empty" that
    // historically blocked the composer for free chat.
    expect(creditBalancePrompt(0)).toBe("low");
    expect(creditBalancePrompt(CHAT_CREDIT_COST - 1)).toBe("low");
  });

  it("returns low within premium-tool threshold", () => {
    expect(creditBalancePrompt(LOW_CREDIT_THRESHOLD)).toBe("low");
    expect(creditBalancePrompt(CREDIT_COSTS.image - 1)).toBe("low");
  });

  it("returns null when balance is healthy for premium ops", () => {
    expect(creditBalancePrompt(Math.max(LOW_CREDIT_THRESHOLD, CREDIT_COSTS.image) + 1)).toBeNull();
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
  it("covers proactive variants without implying chat is per-message paid", () => {
    expect(creditPromptMessage({ variant: "empty", creditCost: 2 })).toMatch(/out of credits/i);
    expect(creditPromptMessage({ variant: "empty", creditCost: 2 })).toMatch(/Ordinary chat stays free/i);
    expect(creditPromptMessage({ variant: "empty", creditCost: 2 })).toMatch(/Pro/i);
    expect(creditPromptMessage({ variant: "low", credits: 3 })).toMatch(/3 credits left/i);
    expect(creditPromptMessage({ variant: "low", credits: 3 })).toMatch(/Ordinary chat stays free/i);
    expect(creditPromptMessage({ variant: "subscribe" })).toMatch(/150/);
  });
});
