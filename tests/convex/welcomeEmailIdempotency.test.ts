/**
 * @vitest-environment node
 * Stage B1 — welcome-email claim / uncertain / duplicate prevention (pure + wiring).
 * Does not call Resend or Convex production.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  evaluateWelcomeEmailClaim,
  isAmbiguousDeliveryFailure,
} from "../../convex/engagementAnnouncementSafety";

describe("welcome email claim gate", () => {
  it("allows claim when unset or failed", () => {
    expect(evaluateWelcomeEmailClaim(undefined)).toEqual({ ok: true });
    expect(evaluateWelcomeEmailClaim(null)).toEqual({ ok: true });
    expect(evaluateWelcomeEmailClaim("failed")).toEqual({ ok: true });
  });

  it("blocks sent, in-flight, and uncertain (no auto-retry of ambiguous)", () => {
    expect(evaluateWelcomeEmailClaim("sent")).toEqual({
      ok: false,
      reason: "already_sent",
    });
    expect(evaluateWelcomeEmailClaim("sending")).toEqual({
      ok: false,
      reason: "in_flight",
    });
    expect(evaluateWelcomeEmailClaim("uncertain")).toEqual({
      ok: false,
      reason: "uncertain_delivery",
    });
  });

  it("models concurrent deliver: second claim sees in_flight or already_sent", () => {
    const first = evaluateWelcomeEmailClaim(undefined);
    expect(first.ok).toBe(true);
    // After claim, status is sending.
    expect(evaluateWelcomeEmailClaim("sending")).toEqual({
      ok: false,
      reason: "in_flight",
    });
    // After success, status is sent.
    expect(evaluateWelcomeEmailClaim("sent")).toEqual({
      ok: false,
      reason: "already_sent",
    });
  });

  it("treats network_error as ambiguous for welcome bookkeeping", () => {
    expect(isAmbiguousDeliveryFailure("network_error")).toBe(true);
    expect(isAmbiguousDeliveryFailure("rate_limited")).toBe(false);
    expect(isAmbiguousDeliveryFailure("provider_error")).toBe(false);
  });
});

describe("welcome email wiring (Stage B1)", () => {
  const root = resolve(__dirname, "../..");

  it("adds additive schema fields without touching announcement keys", () => {
    const schema = readFileSync(resolve(root, "convex/schema.ts"), "utf8");
    expect(schema).toContain("welcomeEmailStatus");
    expect(schema).toContain("welcomeEmailAt");
    expect(schema).toContain('v.literal("sending")');
    expect(schema).toContain('v.literal("uncertain")');
    expect(schema).toContain("lastFeatureAnnouncementCampaignKey");
  });

  it("wires internal claim/mark mutations and signup deliverWelcomeEmail", () => {
    const engagement = readFileSync(
      resolve(root, "convex/engagementEmail.ts"),
      "utf8"
    );
    const auth = readFileSync(
      resolve(root, "convex/authPasswordActions.ts"),
      "utf8"
    );

    expect(engagement).toContain(
      "export const claimWelcomeEmailSendInternal = internalMutation"
    );
    expect(engagement).toContain(
      "export const markWelcomeEmailSentInternal = internalMutation"
    );
    expect(engagement).toContain(
      "export const markWelcomeEmailUncertainInternal = internalMutation"
    );
    expect(engagement).toContain(
      "export const markWelcomeEmailFailedInternal = internalMutation"
    );
    expect(engagement).toContain("evaluateWelcomeEmailClaim");
    expect(engagement).not.toMatch(
      /export const claimWelcomeEmailSend\s*=\s*mutation/
    );

    expect(auth).toContain("deliverWelcomeEmail");
    expect(auth).toContain("claimWelcomeEmailSendInternal");
    expect(auth).toContain("markWelcomeEmailSentInternal");
    expect(auth).toContain("markWelcomeEmailUncertainInternal");
    expect(auth).toContain("markWelcomeEmailFailedInternal");
    expect(auth).toContain("isAmbiguousDeliveryFailure");
    expect(auth).toContain("void deliverWelcomeEmail(ctx, email)");
    // Signup must stay non-blocking.
    expect(auth).toMatch(
      /void deliverWelcomeEmail\(ctx, email\)\.catch\(\(\) => undefined\)/
    );
  });

  it("does not alter announcement claim / reconcile / digest safety markers", () => {
    const engagement = readFileSync(
      resolve(root, "convex/engagementEmail.ts"),
      "utf8"
    );
    const actions = readFileSync(
      resolve(root, "convex/engagementEmailActions.ts"),
      "utf8"
    );
    const safety = readFileSync(
      resolve(root, "convex/engagementAnnouncementSafety.ts"),
      "utf8"
    );

    expect(engagement).toContain("claimFeatureAnnouncementSendInternal");
    expect(engagement).toContain("reconcileFeatureAnnouncementDeliveryInternal");
    expect(engagement).toContain("never auto-reclaim");
    expect(actions).toContain("sendEmailWithBoundedRetry");
    expect(actions).toContain("markFeatureAnnouncementUncertainInternal");
    expect(safety).toContain("tipCampaignKey");
    expect(safety).toContain("evaluateEngagementEligibility");
  });
});
