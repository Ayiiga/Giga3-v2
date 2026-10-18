import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("creator monetisation server rules", () => {
  it("exports 5 / 20 fan thresholds and policy version", () => {
    const src = readFileSync(
      resolve(__dirname, "../../convex/gigaSocialEconomy.ts"),
      "utf8"
    );
    expect(src).toContain("MIN_FANS_FOR_MONETIZATION = 5");
    expect(src).toContain("MIN_FANS_FOR_WITHDRAWAL = 20");
    expect(src).toContain('CREATOR_MONETIZATION_POLICY_VERSION = "giga-creator-monetisation-v1"');
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
    expect(handler).toContain("Outdated policy version");
  });

  it("blocks withdrawals below 20 fans and without acceptance", () => {
    const src = readFileSync(
      resolve(__dirname, "../../convex/gigaSocialEconomy.ts"),
      "utf8"
    );
    expect(src).toContain("assertWithdrawalEligibility");
    expect(src).toContain("Accept the creator monetisation rules before requesting a withdrawal");
    expect(src).toContain("Withdrawals unlock at");
    expect(src).toContain("requestCreatorWithdrawal");
    expect(src).toContain("A matching withdrawal request is already pending");
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
