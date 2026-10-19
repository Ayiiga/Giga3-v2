import { describe, expect, it } from "vitest";
import {
  CREATOR_MONETIZATION_POLICY_VERSION,
  hasValidMonetizationConsent,
  validateWithdrawalAmountGhs,
} from "../../convex/gigaSocialMonetizationConsent";

describe("hasValidMonetizationConsent", () => {
  const creatorId = "creator@example.com";

  it("rejects missing economy or creator id", () => {
    expect(hasValidMonetizationConsent(null, creatorId)).toBe(false);
    expect(hasValidMonetizationConsent({}, "")).toBe(false);
  });

  it("never treats legacy monetizationUnlockedAt as consent", () => {
    expect(
      hasValidMonetizationConsent(
        { monetizationUnlockedAt: Date.now() },
        creatorId
      )
    ).toBe(false);
    expect(
      hasValidMonetizationConsent(
        {
          monetizationUnlockedAt: Date.now(),
          monetizationAcceptedAt: Date.now(),
          monetizationPolicyVersion: CREATOR_MONETIZATION_POLICY_VERSION,
          // missing acceptedBy
        },
        creatorId
      )
    ).toBe(false);
  });

  it("requires acceptedAt + current policy version + matching acceptedBy", () => {
    const now = Date.now();
    expect(
      hasValidMonetizationConsent(
        {
          monetizationAcceptedAt: now,
          monetizationPolicyVersion: "stale-v0",
          monetizationAcceptedBy: creatorId,
        },
        creatorId
      )
    ).toBe(false);
    expect(
      hasValidMonetizationConsent(
        {
          monetizationAcceptedAt: now,
          monetizationPolicyVersion: CREATOR_MONETIZATION_POLICY_VERSION,
          monetizationAcceptedBy: "other@example.com",
        },
        creatorId
      )
    ).toBe(false);
    expect(
      hasValidMonetizationConsent(
        {
          monetizationAcceptedAt: now,
          monetizationPolicyVersion: CREATOR_MONETIZATION_POLICY_VERSION,
          monetizationAcceptedBy: creatorId,
        },
        creatorId
      )
    ).toBe(true);
  });

  it("matches acceptedBy case-insensitively", () => {
    expect(
      hasValidMonetizationConsent(
        {
          monetizationAcceptedAt: 1,
          monetizationPolicyVersion: CREATOR_MONETIZATION_POLICY_VERSION,
          monetizationAcceptedBy: "Creator@Example.com",
        },
        "creator@example.com"
      )
    ).toBe(true);
  });
});

describe("validateWithdrawalAmountGhs", () => {
  it("rejects non-finite, non-positive, and fractional amounts", () => {
    expect(
      validateWithdrawalAmountGhs({
        rawAmount: NaN,
        availableBalanceGhs: 100,
        minWithdrawalGhs: 50,
      }).ok
    ).toBe(false);
    expect(
      validateWithdrawalAmountGhs({
        rawAmount: Infinity,
        availableBalanceGhs: 100,
        minWithdrawalGhs: 50,
      }).ok
    ).toBe(false);
    expect(
      validateWithdrawalAmountGhs({
        rawAmount: 0,
        availableBalanceGhs: 100,
        minWithdrawalGhs: 50,
      }).ok
    ).toBe(false);
    expect(
      validateWithdrawalAmountGhs({
        rawAmount: -10,
        availableBalanceGhs: 100,
        minWithdrawalGhs: 50,
      }).ok
    ).toBe(false);
    expect(
      validateWithdrawalAmountGhs({
        rawAmount: 50.5,
        availableBalanceGhs: 100,
        minWithdrawalGhs: 50,
      }).ok
    ).toBe(false);
  });

  it("enforces minimum, balance, and optional maximum", () => {
    expect(
      validateWithdrawalAmountGhs({
        rawAmount: 40,
        availableBalanceGhs: 100,
        minWithdrawalGhs: 50,
      })
    ).toEqual({ ok: false, error: "Minimum withdrawal is GHS 50." });
    expect(
      validateWithdrawalAmountGhs({
        rawAmount: 80,
        availableBalanceGhs: 70,
        minWithdrawalGhs: 50,
      })
    ).toEqual({ ok: false, error: "Insufficient withdrawable balance." });
    expect(
      validateWithdrawalAmountGhs({
        rawAmount: 200,
        availableBalanceGhs: 500,
        minWithdrawalGhs: 50,
        maxWithdrawalGhs: 100,
      })
    ).toEqual({ ok: false, error: "Maximum withdrawal is GHS 100." });
    expect(
      validateWithdrawalAmountGhs({
        rawAmount: 50,
        availableBalanceGhs: 50,
        minWithdrawalGhs: 50,
      })
    ).toEqual({ ok: true, amountGhs: 50 });
  });
});
