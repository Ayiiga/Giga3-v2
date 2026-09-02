import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  decideRenewal,
  describePaymentMethod,
  extractReusableAuthorization,
  isRenewalReference,
  RENEWAL_LEAD_MS,
  RENEWAL_MAX_FAILURES,
  RENEWAL_REMINDER_LEAD_MS,
  RENEWAL_RETRY_COOLDOWN_MS,
  renewalReference,
} from "../../convex/subscriptionRenewalLogic";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

const cardAuth = {
  authorization_code: "AUTH_abc123",
  reusable: true,
  channel: "card",
  card_type: "visa",
  last4: "4081",
  exp_month: "12",
  exp_year: "2030",
  bank: "TEST BANK",
  brand: "visa",
  signature: "SIG_x",
};

describe("extractReusableAuthorization", () => {
  it("reads a reusable card from a transaction/verify payload", () => {
    const auth = extractReusableAuthorization(
      JSON.stringify({
        status: "success",
        amount: 6000,
        authorization: cardAuth,
        customer: { email: "Buyer@Example.com" },
      })
    );
    expect(auth).toMatchObject({
      authorizationCode: "AUTH_abc123",
      reusable: true,
      channel: "card",
      last4: "4081",
      brand: "visa",
      customerEmail: "buyer@example.com",
    });
  });

  it("reads the same card from a full webhook event", () => {
    const auth = extractReusableAuthorization(
      JSON.stringify({
        event: "charge.success",
        data: { authorization: cardAuth, customer: { email: "b@example.com" } },
      })
    );
    expect(auth?.authorizationCode).toBe("AUTH_abc123");
  });

  it("returns null for mobile money (non-reusable) and malformed input", () => {
    expect(
      extractReusableAuthorization(
        JSON.stringify({
          authorization: { authorization_code: "AUTH_momo", reusable: false, channel: "mobile_money" },
        })
      )
    ).toBeNull();
    expect(
      extractReusableAuthorization(
        JSON.stringify({ authorization: { authorization_code: "nope", reusable: true } })
      )
    ).toBeNull();
    expect(extractReusableAuthorization("not json")).toBeNull();
    expect(extractReusableAuthorization(JSON.stringify({ status: "success" }))).toBeNull();
  });
});

describe("decideRenewal", () => {
  const paid = (overrides: Partial<Parameters<typeof decideRenewal>[0]> = {}) => ({
    subscriptionPlan: "pro",
    subscriptionExpiresAt: NOW + DAY,
    autoRenew: true,
    renewalFailures: 0,
    lastRenewalAttemptAt: null,
    ...overrides,
  });

  it("charges a saved card when the period ends within the lead window", () => {
    expect(decideRenewal(paid(), true, NOW)).toEqual({ action: "charge" });
    expect(
      decideRenewal(paid({ subscriptionExpiresAt: NOW + RENEWAL_LEAD_MS }), true, NOW)
    ).toEqual({ action: "charge" });
  });

  it("does nothing when the user turned auto-renew off", () => {
    expect(decideRenewal(paid({ autoRenew: false }), true, NOW)).toEqual({
      action: "skip",
      reason: "auto_renew_off",
    });
  });

  it("treats undefined autoRenew as on", () => {
    expect(decideRenewal(paid({ autoRenew: undefined }), true, NOW)).toEqual({
      action: "charge",
    });
  });

  it("skips free plans, expired plans and periods that are not due yet", () => {
    expect(decideRenewal(paid({ subscriptionPlan: "free" }), true, NOW).action).toBe("skip");
    expect(
      decideRenewal(paid({ subscriptionExpiresAt: NOW - 1 }), true, NOW)
    ).toEqual({ action: "skip", reason: "already_expired" });
    expect(
      decideRenewal(paid({ subscriptionExpiresAt: NOW + RENEWAL_LEAD_MS + 1 }), true, NOW)
    ).toEqual({ action: "skip", reason: "not_due" });
  });

  it("stops after the max failures and honours the retry cooldown", () => {
    expect(
      decideRenewal(paid({ renewalFailures: RENEWAL_MAX_FAILURES }), true, NOW)
    ).toEqual({ action: "skip", reason: "max_failures" });
    expect(
      decideRenewal(
        paid({ lastRenewalAttemptAt: NOW - RENEWAL_RETRY_COOLDOWN_MS + 1000 }),
        true,
        NOW
      )
    ).toEqual({ action: "skip", reason: "cooldown" });
    expect(
      decideRenewal(
        paid({ lastRenewalAttemptAt: NOW - RENEWAL_RETRY_COOLDOWN_MS - 1000 }),
        true,
        NOW
      )
    ).toEqual({ action: "charge" });
  });

  it("reminds (never charges) when there is no reusable method", () => {
    expect(
      decideRenewal(paid({ subscriptionExpiresAt: NOW + RENEWAL_REMINDER_LEAD_MS }), false, NOW)
    ).toEqual({ action: "remind" });
    expect(
      decideRenewal(
        paid({ subscriptionExpiresAt: NOW + RENEWAL_REMINDER_LEAD_MS + DAY }),
        false,
        NOW
      )
    ).toEqual({ action: "skip", reason: "not_due" });
  });
});

describe("renewal references and labels", () => {
  it("builds recognisable renewal references", () => {
    const ref = renewalReference("pro", NOW, "abc1234");
    expect(ref).toBe(`giga3_renew_pro_${NOW}_abc1234`);
    expect(isRenewalReference(ref)).toBe(true);
    expect(isRenewalReference("giga3_sub_pro_monthly_1_x")).toBe(false);
  });

  it("describes payment methods without leaking codes", () => {
    expect(describePaymentMethod({ channel: "card", brand: "visa", last4: "4081" })).toBe(
      "Visa •••• 4081"
    );
    expect(describePaymentMethod({ channel: "card" })).toBe("Card");
    expect(describePaymentMethod({ channel: "mobile_money", bank: "MTN" })).toBe(
      "Mobile money (MTN)"
    );
  });
});

describe("renewal wiring", () => {
  const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

  it("registers the renewal cron before the expiry sweep", () => {
    const crons = read("convex/crons.ts");
    const renew = crons.indexOf("internal.subscriptionRenewal.processDueRenewals");
    const expire = crons.indexOf("internal.subscriptions.expireStaleSubscriptions");
    expect(renew).toBeGreaterThan(-1);
    expect(expire).toBeGreaterThan(renew);
  });

  it("captures reusable authorizations during fulfillment and tags renewal periods", () => {
    const paystack = read("convex/paystack.ts");
    expect(paystack).toContain("extractReusableAuthorization(args.paystackResponse)");
    expect(paystack).toContain("internal.subscriptionRenewal.saveAuthorization");
    expect(paystack).toContain('record.isRenewal ? "renewal" : "checkout"');
    expect(paystack).toContain("channels: [...PAYSTACK_CHANNELS]");
  });

  it("uses Paystack charge_authorization and never charges complimentary periods", () => {
    const renewal = read("convex/subscriptionRenewal.ts");
    expect(renewal).toContain('"/transaction/charge_authorization"');
    expect(renewal).toContain('reason: "complimentary"');
    expect(renewal).toContain("dryRun");
  });

  it("stores the schema pieces the renewal engine depends on", () => {
    const schema = read("convex/schema.ts");
    expect(schema).toContain("billingAuthorizations: defineTable");
    expect(schema).toContain("autoRenew: v.optional(v.boolean())");
    expect(schema).toContain('.index("by_subscription_expiry", ["subscriptionExpiresAt"])');
    expect(schema).toContain('v.literal("complimentary")');
  });

  it("exposes cancel controls and a masked saved method to the client", () => {
    const subs = read("convex/subscriptions.ts");
    expect(subs).toContain("export const setAutoRenew = mutation");
    expect(subs).toContain("export const removeSavedPaymentMethod = mutation");
    expect(subs).toContain("export const getRenewalSettings = query");
    expect(subs).not.toMatch(/authorizationCode:\s*method\.authorizationCode/);
    expect(subs).toContain("export const grantComplimentarySubscription = internalMutation");

    const card = read("web/components/wallet/AutoRenewalCard.tsx");
    expect(card).toContain("api.subscriptions.setAutoRenew");
    expect(card).toContain("Turn off auto-renewal");
    expect(read("web/components/wallet/WalletSubscriptionPanel.tsx")).toContain(
      "<AutoRenewalCard sessionToken={sessionToken} />"
    );
  });
});
