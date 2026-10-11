/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ANNOUNCEMENT_429_MAX_ATTEMPTS,
  ANNOUNCEMENT_ALLOWLIST_MAX,
  ANNOUNCEMENT_CLAIM_TTL_MS,
  DEFAULT_FEATURE_ANNOUNCEMENT_CAMPAIGN,
  announcementSenderPreflight,
  backoffMsFor429Attempt,
  campaignSendingKey,
  campaignUncertainKey,
  filterEmailsToAllowlist,
  isAmbiguousDeliveryFailure,
  isAuthFromEmailConfigured,
  isCampaignBlockedForRecipient,
  isEmailInAllowlist,
  isResendSandboxSender,
  redactEmail,
  resolveAnnouncementAllowlist,
  shouldAbortAnnouncementBatch,
} from "../../convex/engagementAnnouncementSafety";
import {
  classifyResendFailure,
  getAuthFromEmail,
  sendEmailWithBoundedRetry,
} from "../../convex/emailClient";

describe("smoke allowlist — no bulk fallback", () => {
  it("requires exactly one validated recipient in smoke mode", () => {
    expect(resolveAnnouncementAllowlist("smoke", undefined, undefined)).toEqual({
      ok: false,
      reason: "smoke_requires_single_recipient",
    });
    expect(resolveAnnouncementAllowlist("smoke", undefined, [])).toEqual({
      ok: false,
      reason: "smoke_requires_single_recipient",
    });
    expect(resolveAnnouncementAllowlist("smoke", "a@x.co", ["b@x.co"]).ok).toBe(false);
    expect(resolveAnnouncementAllowlist("smoke", " Owner@Example.com ", null)).toEqual({
      ok: true,
      emails: ["owner@example.com"],
    });
  });

  it("bulk mode scans when untargeted, but empty allowlist fails closed", () => {
    expect(resolveAnnouncementAllowlist("bulk", undefined, undefined)).toEqual({
      ok: true,
      emails: null,
    });
    expect(resolveAnnouncementAllowlist("bulk", undefined, [])).toEqual({
      ok: false,
      reason: "empty_allowlist",
    });
    expect(resolveAnnouncementAllowlist("bulk", "a@x.co", ["b@x.co"])).toEqual({
      ok: true,
      emails: ["a@x.co", "b@x.co"],
    });
    const huge = Array.from({ length: ANNOUNCEMENT_ALLOWLIST_MAX + 1 }, (_, i) => `u${i}@x.co`);
    expect(resolveAnnouncementAllowlist("bulk", undefined, huge).ok).toBe(false);
  });

  it("never lets a targeted send include addresses outside the allowlist", () => {
    const allowlist = ["a@giga3.ai", "b@giga3.ai"];
    const scanned = ["a@giga3.ai", "evil@elsewhere.com", "b@giga3.ai", "c@giga3.ai"];
    expect(filterEmailsToAllowlist(scanned, allowlist)).toEqual([
      "a@giga3.ai",
      "b@giga3.ai",
    ]);
    expect(isEmailInAllowlist("evil@elsewhere.com", allowlist)).toBe(false);
  });

  it("redacts emails for outcomes/logs", () => {
    expect(redactEmail("ayiiga3@gmail.com")).toBe("a***3@gmail.com");
  });
});

describe("sender preflight", () => {
  it("blocks multi/bulk when AUTH_FROM_EMAIL is missing or sandbox", () => {
    expect(isAuthFromEmailConfigured(undefined)).toBe(false);
    expect(isAuthFromEmailConfigured("")).toBe(false);
    expect(isAuthFromEmailConfigured("Giga3 AI <noreply@giga3ai.com>")).toBe(true);
    expect(isResendSandboxSender("Giga3 AI <onboarding@resend.dev>")).toBe(true);

    expect(
      announcementSenderPreflight({
        from: "Giga3 AI <onboarding@resend.dev>",
        authFromConfigured: false,
        effectiveRecipientCount: 40,
        mode: "bulk",
      })
    ).toEqual({ ok: false, reason: "auth_from_email_missing" });

    expect(
      announcementSenderPreflight({
        from: "Giga3 AI <onboarding@resend.dev>",
        authFromConfigured: true,
        effectiveRecipientCount: 40,
        mode: "bulk",
      })
    ).toEqual({ ok: false, reason: "sandbox_sender_blocks_multi" });
  });

  it("allows single-recipient smoke with sandbox sender when AUTH_FROM is set to sandbox", () => {
    expect(
      announcementSenderPreflight({
        from: "Giga3 AI <onboarding@resend.dev>",
        authFromConfigured: true,
        effectiveRecipientCount: 1,
        mode: "smoke",
      })
    ).toEqual({ ok: true });
  });

  it("allows bulk when From is a verified-domain address", () => {
    expect(
      announcementSenderPreflight({
        from: "Giga3 AI <noreply@giga3ai.com>",
        authFromConfigured: true,
        effectiveRecipientCount: 40,
        mode: "bulk",
      })
    ).toEqual({ ok: true });
  });

  it("aborts batch on sandbox_recipient or domain_unverified", () => {
    expect(shouldAbortAnnouncementBatch("sandbox_recipient")).toBe(true);
    expect(shouldAbortAnnouncementBatch("domain_unverified")).toBe(true);
    expect(shouldAbortAnnouncementBatch("rate_limited")).toBe(false);
    expect(shouldAbortAnnouncementBatch("network_error")).toBe(false);
  });
});

describe("campaign idempotency & ambiguous delivery", () => {
  const key = DEFAULT_FEATURE_ANNOUNCEMENT_CAMPAIGN;

  it("blocks sent, uncertain, and in-flight claims; allows stale sending claims", () => {
    expect(isCampaignBlockedForRecipient(key, key, Date.now())).toBe("sent");
    expect(
      isCampaignBlockedForRecipient(campaignUncertainKey(key), key, Date.now())
    ).toBe("uncertain");
    expect(
      isCampaignBlockedForRecipient(campaignSendingKey(key), key, Date.now())
    ).toBe("in_flight");
    expect(
      isCampaignBlockedForRecipient(
        campaignSendingKey(key),
        key,
        Date.now() - ANNOUNCEMENT_CLAIM_TTL_MS - 1
      )
    ).toBeNull();
  });

  it("treats network_error as ambiguous (no blind resend)", () => {
    expect(isAmbiguousDeliveryFailure("network_error")).toBe(true);
    expect(isAmbiguousDeliveryFailure("rate_limited")).toBe(false);
    expect(isAmbiguousDeliveryFailure("provider_error")).toBe(false);
  });
});

describe("HTTP 429 bounded retry", () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.AUTH_FROM_EMAIL = "Giga3 AI <noreply@giga3ai.com>";
  });

  afterEach(() => {
    process.env = { ...prev };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("classifies 429 as rate_limited", () => {
    expect(classifyResendFailure(429, "Too many requests").reason).toBe("rate_limited");
  });

  it("retries 429 a bounded number of times then stops", async () => {
    const sleeps: number[] = [];
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls += 1;
        return new Response(JSON.stringify({ message: "Too many requests." }), {
          status: 429,
        });
      })
    );

    const result = await sendEmailWithBoundedRetry(
      { to: "user@example.com", subject: "t", html: "<p>x</p>" },
      {
        maxAttempts: ANNOUNCEMENT_429_MAX_ATTEMPTS,
        sleep: async (ms) => {
          sleeps.push(ms);
        },
        backoffMs: [10, 20, 30],
      }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("rate_limited");
    expect(result.attempts).toBe(ANNOUNCEMENT_429_MAX_ATTEMPTS);
    expect(calls).toBe(ANNOUNCEMENT_429_MAX_ATTEMPTS);
    expect(sleeps.length).toBe(ANNOUNCEMENT_429_MAX_ATTEMPTS - 1);
    expect(backoffMsFor429Attempt(0)).toBeGreaterThan(0);
  });

  it("does not retry sandbox_recipient or domain_unverified", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls += 1;
        return new Response(
          JSON.stringify({
            message: "You can only send testing emails to your own email address.",
          }),
          { status: 403 }
        );
      })
    );
    const result = await sendEmailWithBoundedRetry(
      { to: "other@example.com", subject: "t", html: "<p>x</p>" },
      { maxAttempts: 3, sleep: async () => undefined }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("sandbox_recipient");
    expect(calls).toBe(1);
  });

  it("succeeds after a transient 429 within the bound", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls += 1;
        if (calls === 1) {
          return new Response(JSON.stringify({ message: "Too many requests." }), {
            status: 429,
          });
        }
        return new Response(JSON.stringify({ id: "email_ok" }), { status: 200 });
      })
    );
    const result = await sendEmailWithBoundedRetry(
      { to: "user@example.com", subject: "t", html: "<p>x</p>" },
      { maxAttempts: 3, sleep: async () => undefined, backoffMs: [1, 1, 1] }
    );
    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(2);
  });
});

describe("wiring, digests, cron regressions", () => {
  it("wires smoke mode, claim/uncertain, preflight, abort, and bounded retry", () => {
    const actions = readFileSync(
      resolve(__dirname, "../../convex/engagementEmailActions.ts"),
      "utf8"
    );
    const engagement = readFileSync(
      resolve(__dirname, "../../convex/engagementEmail.ts"),
      "utf8"
    );
    const schema = readFileSync(resolve(__dirname, "../../convex/schema.ts"), "utf8");
    const crons = readFileSync(resolve(__dirname, "../../convex/crons.ts"), "utf8");

    expect(actions).toContain('v.literal("smoke")');
    expect(actions).toContain("smoke_requires_exactly_one_recipient");
    expect(actions).toContain("claimFeatureAnnouncementSendInternal");
    expect(actions).toContain("markFeatureAnnouncementUncertainInternal");
    expect(actions).toContain("releaseFeatureAnnouncementClaimInternal");
    expect(actions).toContain("isAmbiguousDeliveryFailure");
    expect(actions).toContain("isAuthFromEmailConfigured");
    expect(actions).toContain("sendEmailWithBoundedRetry");
    expect(actions).toContain("shouldAbortAnnouncementBatch");

    expect(engagement).toContain("listAnnouncementCandidatesInternal");
    expect(engagement).toContain("isCampaignBlockedForRecipient");
    expect(engagement).toContain("listEngagementCandidatesInternal");
    expect(engagement).toContain("markEngagementEmailSentInternal");

    expect(schema).toContain("lastFeatureAnnouncementAt");
    expect(schema).toContain("lastFeatureAnnouncementCampaignKey");

    // Cron still schedules announcements + digests with prior args.
    expect(crons).toContain("sendFeatureAnnouncementEmails");
    expect(crons).toContain("minDaysSinceLastEmail: 12");
    expect(crons).toContain("sendEngagementDigests");
  });

  it("digest action body stays free of announcement allowlist/campaign claim logic", () => {
    const actions = readFileSync(
      resolve(__dirname, "../../convex/engagementEmailActions.ts"),
      "utf8"
    );
    const start = actions.indexOf("export const sendEngagementDigests");
    const end = actions.indexOf("export const sendFeatureAnnouncementEmails");
    const digestFn = actions.slice(start, end).replace(/\/\*\*[\s\S]*?\*\//g, "");
    expect(digestFn).toContain("listEngagementCandidatesInternal");
    expect(digestFn).toContain("markEngagementEmailSentInternal");
    expect(digestFn).not.toContain("markFeatureAnnouncementSentInternal");
    expect(digestFn).not.toContain("claimFeatureAnnouncementSendInternal");
    expect(digestFn).not.toContain("allowlist");
    expect(digestFn).not.toContain("campaignKey");
  });

  it("getAuthFromEmail still reads AUTH_FROM_EMAIL with sandbox fallback", () => {
    const saved = process.env.AUTH_FROM_EMAIL;
    delete process.env.AUTH_FROM_EMAIL;
    expect(getAuthFromEmail()).toContain("onboarding@resend.dev");
    process.env.AUTH_FROM_EMAIL = "Giga3 AI <noreply@giga3ai.com>";
    expect(getAuthFromEmail()).toContain("noreply@giga3ai.com");
    if (saved === undefined) delete process.env.AUTH_FROM_EMAIL;
    else process.env.AUTH_FROM_EMAIL = saved;
  });
});
