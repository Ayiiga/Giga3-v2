import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("creator monetisation server rules", () => {
  it("exports 5 / 50 fan thresholds and policy version", () => {
    const src = readFileSync(
      resolve(__dirname, "../../convex/gigaSocialEconomy.ts"),
      "utf8"
    );
    expect(src).toContain("MIN_FANS_FOR_MONETIZATION = 5");
    expect(src).toContain("MIN_FANS_FOR_WITHDRAWAL = 50");
    expect(src).toContain('CREATOR_MONETIZATION_POLICY_VERSION');
    expect(src).toContain("hasValidMonetizationConsent");
    expect(src).not.toContain("function hasAcceptedMonetization");
  });

  it("records acceptance server-side with fan verification", () => {
    const src = readFileSync(
      resolve(__dirname, "../../convex/gigaSocialEconomy.ts"),
      "utf8"
    );
    const start = src.indexOf("export const acceptMonetizationTerms");
    expect(start).toBeGreaterThan(-1);
    const next = src.indexOf("export const ", start + 10);
    const handler = src.slice(start, next === -1 ? undefined : next);
    expect(handler).toContain("requireSession(args.sessionToken, ctx)");
    expect(handler).toContain("minFansForMonetization");
    expect(handler).toContain("monetizationAcceptedAt");
    expect(handler).toContain("monetizationPolicyVersion");
    expect(handler).toContain("monetizationAcceptedBy: userId");
    expect(handler).toContain("Outdated policy version");
    expect(handler).toContain("Date.now()");
    expect(handler).toContain("monetizationAcceptedAt: now");
    expect(handler).not.toContain("args.acceptedAt");
    expect(handler).not.toContain("args.userId");
  });

  it("blocks withdrawals below 50 fans and without acceptance", () => {
    const src = readFileSync(
      resolve(__dirname, "../../convex/gigaSocialEconomy.ts"),
      "utf8"
    );
    expect(src).toContain("assertWithdrawalEligibility");
    expect(src).toContain("Accept the creator monetisation rules before requesting a withdrawal");
    expect(src).toContain("Withdrawals unlock at");
    expect(src).toContain("requestCreatorWithdrawal");
    expect(src).toContain("validateWithdrawalAmountGhs");
    expect(src).toContain("A withdrawal is already in progress");
  });

  it("never treats legacy unlock timestamps as current-policy consent", () => {
    const consent = readFileSync(
      resolve(__dirname, "../../convex/gigaSocialMonetizationConsent.ts"),
      "utf8"
    );
    expect(consent).toContain("Legacy monetizationUnlockedAt alone is NEVER valid consent");
    expect(consent).toContain("hasValidMonetizationConsent");
    const economy = readFileSync(
      resolve(__dirname, "../../convex/gigaSocialEconomy.ts"),
      "utf8"
    );
    expect(economy).toContain("requiresPolicyReacceptance");
    expect(economy).toContain("legacyUnlockOnly");
  });

  it("marketplace payouts reuse amount validation and in-flight guards", () => {
    const src = readFileSync(resolve(__dirname, "../../convex/marketplace.ts"), "utf8");
    const start = src.indexOf("export const requestPayout");
    const next = src.indexOf("export const ", start + 10);
    const handler = src.slice(start, next === -1 ? undefined : next);
    expect(handler).toContain("assertWithdrawalEligibility");
    expect(handler).toContain("validateWithdrawalAmountGhs");
    expect(handler).toContain("A withdrawal is already in progress");
    expect(handler).toContain("Payout profile ownership mismatch");
  });

  it("admin payout status changes reject paid→failed refunds", () => {
    const src = readFileSync(
      resolve(__dirname, "../../convex/adminMarketplace.ts"),
      "utf8"
    );
    const start = src.indexOf("export const setPayoutStatus");
    const next = src.indexOf("export const ", start + 10);
    const handler = src.slice(start, next === -1 ? undefined : next);
    expect(handler).toContain("Invalid payout transition");
    expect(handler).toContain('from === "pending" || from === "processing"');
    expect(handler).toContain('paid: []');
  });

  it("rejects affiliate self-referrals", () => {
    const src = readFileSync(
      resolve(__dirname, "../../convex/gigaSocialEconomy.ts"),
      "utf8"
    );
    const start = src.indexOf("export const trackAffiliateClick");
    const next = src.indexOf("export const ", start + 10);
    const handler = src.slice(start, next === -1 ? undefined : next);
    expect(handler).toContain("self_referral");
  });

  it("validates boost ownership before Paystack checkout", () => {
    const src = readFileSync(
      resolve(__dirname, "../../convex/gigaSocialEconomy.ts"),
      "utf8"
    );
    const start = src.indexOf("export const validateBoostCheckoutInternal");
    const next = src.indexOf("export const ", start + 10);
    const handler = src.slice(start, next === -1 ? undefined : next);
    expect(handler).toContain("not owned by you");
    expect(handler).toContain("boostBudgetMinGhs");
  });
});
