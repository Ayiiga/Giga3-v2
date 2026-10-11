/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ANNOUNCEMENT_429_MAX_ATTEMPTS,
  ANNOUNCEMENT_ALLOWLIST_MAX,
  DEFAULT_FEATURE_ANNOUNCEMENT_CAMPAIGN,
  announcementSenderPreflight,
  backoffMsFor429Attempt,
  filterEmailsToAllowlist,
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

describe("announcement allowlist & redaction", () => {
  it("resolves to/allowlist and rejects invalid or oversized lists", () => {
    expect(resolveAnnouncementAllowlist(undefined, undefined)).toEqual({
      ok: true,
      emails: null,
    });
    expect(resolveAnnouncementAllowlist(" Owner@Example.com ", ["b@x.co"])).toEqual({
      ok: true,
      emails: ["owner@example.com", "b@x.co"],
    });
    expect(resolveAnnouncementAllowlist("not-an-email", null).ok).toBe(false);
    const huge = Array.from({ length: ANNOUNCEMENT_ALLOWLIST_MAX + 1 }, (_, i) => `u${i}@x.co`);
    expect(resolveAnnouncementAllowlist(undefined, huge).ok).toBe(false);
  });

  it("never lets a targeted send include addresses outside the allowlist", () => {
    const allowlist = ["a@giga3.ai", "b@giga3.ai"];
    const scanned = ["a@giga3.ai", "evil@elsewhere.com", "b@giga3.ai", "c@giga3.ai"];
    expect(filterEmailsToAllowlist(scanned, allowlist)).toEqual([
      "a@giga3.ai",
      "b@giga3.ai",
    ]);
    expect(isEmailInAllowlist("evil@elsewhere.com", allowlist)).toBe(false);
    expect(isEmailInAllowlist("A@Giga3.ai", allowlist)).toBe(true);
  });

  it("redacts emails for outcomes/logs", () => {
    expect(redactEmail("ayiiga3@gmail.com")).toBe("a***3@gmail.com");
    expect(redactEmail("ab@x.co")).toBe("a***b@x.co");
  });
});

describe("announcement sender preflight & abort", () => {
  it("blocks multi-recipient sends when From is onboarding@resend.dev", () => {
    expect(isResendSandboxSender("Giga3 AI <onboarding@resend.dev>")).toBe(true);
    expect(isResendSandboxSender("Giga3 AI <noreply@giga3ai.com>")).toBe(false);
    expect(announcementSenderPreflight("Giga3 AI <onboarding@resend.dev>", 2)).toEqual({
      ok: false,
      reason: "sandbox_sender_blocks_multi",
    });
    expect(announcementSenderPreflight("Giga3 AI <onboarding@resend.dev>", 40)).toEqual({
      ok: false,
      reason: "sandbox_sender_blocks_multi",
    });
  });

  it("allows a single-recipient smoke test with sandbox sender", () => {
    expect(announcementSenderPreflight("Giga3 AI <onboarding@resend.dev>", 1)).toEqual({
      ok: true,
    });
  });

  it("allows multi-recipient when From uses a verified-domain address", () => {
    expect(announcementSenderPreflight("Giga3 AI <noreply@giga3ai.com>", 40)).toEqual({
      ok: true,
    });
  });

  it("aborts the batch on sandbox_recipient or domain_unverified only", () => {
    expect(shouldAbortAnnouncementBatch("sandbox_recipient")).toBe(true);
    expect(shouldAbortAnnouncementBatch("domain_unverified")).toBe(true);
    expect(shouldAbortAnnouncementBatch("rate_limited")).toBe(false);
    expect(shouldAbortAnnouncementBatch("provider_error")).toBe(false);
    expect(shouldAbortAnnouncementBatch("network_error")).toBe(false);
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
      {
        to: "user@example.com",
        subject: "t",
        html: "<p>x</p>",
      },
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

  it("does not retry sandbox_recipient failures", async () => {
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
    expect(result.attempts).toBe(1);
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

describe("announcement wiring & digest isolation", () => {
  it("wires allowlist, preflight, abort, campaign mark, and bounded retry", () => {
    const actions = readFileSync(
      resolve(__dirname, "../../convex/engagementEmailActions.ts"),
      "utf8"
    );
    const engagement = readFileSync(
      resolve(__dirname, "../../convex/engagementEmail.ts"),
      "utf8"
    );
    const schema = readFileSync(resolve(__dirname, "../../convex/schema.ts"), "utf8");

    expect(actions).toContain("resolveAnnouncementAllowlist");
    expect(actions).toContain("announcementSenderPreflight");
    expect(actions).toContain("shouldAbortAnnouncementBatch");
    expect(actions).toContain("sendEmailWithBoundedRetry");
    expect(actions).toContain("markFeatureAnnouncementSentInternal");
    expect(actions).toContain("listAnnouncementCandidatesInternal");
    expect(actions).toContain("allowlist");
    expect(actions).toContain("campaignKey");
    expect(actions).toContain("redactEmail");

    expect(engagement).toContain("listAnnouncementCandidatesInternal");
    expect(engagement).toContain("markFeatureAnnouncementSentInternal");
    expect(engagement).toContain("lastFeatureAnnouncementCampaignKey");
    // Digest path unchanged.
    expect(engagement).toContain("listEngagementCandidatesInternal");
    expect(engagement).toContain("markEngagementEmailSentInternal");
    expect(actions).toContain("sendEngagementDigests");
    expect(actions).toMatch(/markEngagementEmailSentInternal/);

    expect(schema).toContain("lastFeatureAnnouncementAt");
    expect(schema).toContain("lastFeatureAnnouncementCampaignKey");
    expect(DEFAULT_FEATURE_ANNOUNCEMENT_CAMPAIGN).toBeTruthy();
  });

  it("digests still use shared lastEngagementEmailAt without campaign fields", () => {
    const actions = readFileSync(
      resolve(__dirname, "../../convex/engagementEmailActions.ts"),
      "utf8"
    );
    const start = actions.indexOf("export const sendEngagementDigests");
    const end = actions.indexOf("export const sendFeatureAnnouncementEmails");
    // Exclude the JSDoc that precedes the announcement export (mentions allowlist).
    const digestFn = actions.slice(start, end).replace(/\/\*\*[\s\S]*?\*\//g, "");
    expect(digestFn).toContain("listEngagementCandidatesInternal");
    expect(digestFn).toContain("markEngagementEmailSentInternal");
    expect(digestFn).not.toContain("markFeatureAnnouncementSentInternal");
    expect(digestFn).not.toContain("listAnnouncementCandidatesInternal");
    expect(digestFn).not.toContain("allowlist");
    expect(digestFn).not.toContain("campaignKey");
  });

  it("documents campaign skip + global gap for retry semantics in candidate query", () => {
    const engagement = readFileSync(
      resolve(__dirname, "../../convex/engagementEmail.ts"),
      "utf8"
    );
    const ann = engagement.slice(
      engagement.indexOf("listAnnouncementCandidatesInternal"),
      engagement.indexOf("markFeatureAnnouncementSentInternal")
    );
    // Same campaign already sent → skip (no duplicate on retry).
    expect(ann).toContain("lastFeatureAnnouncementCampaignKey === campaignKey");
    // Global engagement gap still respected for cross-mail rate limiting.
    expect(ann).toContain("lastEngagementEmailAt");
    // Failed sends never reach markFeatureAnnouncementSentInternal in the action.
    const actions = readFileSync(
      resolve(__dirname, "../../convex/engagementEmailActions.ts"),
      "utf8"
    );
    expect(actions).toContain("if (result.ok)");
    expect(actions).toContain("markFeatureAnnouncementSentInternal");
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
