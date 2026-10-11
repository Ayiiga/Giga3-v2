"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  getAuthFromEmail,
  getConvexSiteUrl,
  getFrontendBaseUrl,
  isEmailDeliveryConfigured,
  sendEmail,
  sendEmailWithBoundedRetry,
  wrapEmailHtml,
} from "./emailClient";
import {
  ANNOUNCEMENT_429_MAX_ATTEMPTS,
  DEFAULT_FEATURE_ANNOUNCEMENT_CAMPAIGN,
  announcementSenderPreflight,
  isAmbiguousDeliveryFailure,
  isAuthFromEmailConfigured,
  isEmailInAllowlist,
  redactEmail,
  resolveAnnouncementAllowlist,
  shouldAbortAnnouncementBatch,
  type AnnouncementRecipientOutcome,
  type AnnouncementSendMode,
} from "./engagementAnnouncementSafety";

type Candidate = {
  email: string;
  name?: string;
  topics: string[];
  inactiveDays: number;
  streakDays: number;
  unsubscribeToken: string;
  role: string;
};

function pickTheme(candidate: Candidate): {
  title: string;
  lead: string;
  ctaLabel: string;
  ctaPath: string;
  bullets: string[];
} {
  const topics = candidate.topics.map((t) => t.toLowerCase());
  const role = candidate.role.toLowerCase();
  const joined = `${topics.join(" ")} ${role}`;

  if (/learn|study|exam|school|education|teacher|student/.test(joined)) {
    return {
      title: "Your next learning streak is waiting",
      lead: "GigaLearn and chat can turn a short session into clear notes, quizzes, and explanations.",
      ctaLabel: "Continue learning",
      ctaPath: "/gigalearn/",
      bullets: [
        "Ask for a lesson summary or practice questions",
        "Save strong answers into your workspace",
        "Come back tomorrow to keep your streak alive",
      ],
    };
  }

  if (/creat|design|image|video|edit|media|art/.test(joined)) {
    return {
      title: "Make something new in minutes",
      lead: "Media Studio and GigaEdit are ready for your next poster, clip, or social Story.",
      ctaLabel: "Start creating",
      ctaPath: "/gigaedit/",
      bullets: [
        "Generate or refine an image for your brand",
        "Edit and export with GigaEdit",
        "Post a photo or video Story on GigaSocial",
      ],
    };
  }

  if (/fun|entertain|music|story|social|game/.test(joined)) {
    return {
      title: "Come back for entertainment & community",
      lead: "GigaSocial now loads faster offline — reopen watched Reels and posts from cache, then remix with the original video attached.",
      ctaLabel: "Open GigaSocial",
      ctaPath: "/gigasocial/",
      bullets: [
        "Browse your cached feed and Stories offline",
        "Remix keeps the source video in your composition",
        "Tip, comment, and grow with the community",
      ],
    };
  }

  return {
    title: "New on Giga3 AI — faster Social, smarter remix",
    lead: "Your feed is snappier, offline-ready, and remix now keeps the original video attached. Open Giga3 when you are ready.",
    ctaLabel: "Open Giga3",
    ctaPath: "/gigasocial/",
    bullets: [
      "Faster photos & videos with smart caching",
      "Offline feed, Reels, and Stories you already watched",
      "Giga Remix preserves source media + attribution",
    ],
  };
}

function buildFeatureAnnouncementHtml(candidate: Candidate): {
  subject: string;
  html: string;
  text: string;
} {
  const frontend = getFrontendBaseUrl();
  const greet = candidate.name?.trim()
    ? `Hi ${candidate.name.trim().split(/\s+/)[0]},`
    : "Hi there,";
  const unsub = `${getConvexSiteUrl()}/email/unsubscribe?email=${encodeURIComponent(
    candidate.email
  )}&token=${encodeURIComponent(candidate.unsubscribeToken)}`;
  const ctaUrl = `${frontend}/gigasocial/`;

  const html = wrapEmailHtml({
    title: "What’s new in Giga3 AI",
    bodyHtml: `
      <p style="margin:0 0 12px;">${greet}</p>
      <p style="margin:0 0 12px;">
        We upgraded <strong>GigaSocial</strong> so your feed feels faster, works offline with
        content you already watched, and <strong>Remix</strong> keeps the original video in your take.
      </p>
      <ul style="margin:0 0 20px;padding-left:18px;">
        <li style="margin:0 0 6px;">Instant reopen for cached photos, videos, Reels &amp; Stories</li>
        <li style="margin:0 0 6px;">Smarter lazy-loading and prefetch on slow networks</li>
        <li style="margin:0 0 6px;">Remix attaches source media, audio timing &amp; attribution</li>
      </ul>
      <p style="margin:0 0 8px;">
        <a href="${ctaUrl}"
           style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;">
          Explore GigaSocial
        </a>
      </p>
    `,
    footerHtml: `
      <p style="margin:0;">Sent to your verified Giga3 account. Occasional product updates only.</p>
      <p style="margin:8px 0 0;"><a href="${unsub}" style="color:#0f766e;">Unsubscribe from these emails</a></p>
    `,
  });

  const text = [
    greet.replace(/,$/, ""),
    "What’s new: faster GigaSocial, offline cached feed/Reels, and Remix that keeps the source video.",
    `Explore: ${ctaUrl}`,
    `Unsubscribe: ${unsub}`,
  ].join("\n\n");

  return {
    subject: "What’s new in Giga3 AI · GigaSocial upgrade",
    html,
    text,
  };
}

function buildEngagementHtml(candidate: Candidate): {
  subject: string;
  html: string;
  text: string;
} {
  const frontend = getFrontendBaseUrl();
  const theme = pickTheme(candidate);
  const greet = candidate.name?.trim()
    ? `Hi ${candidate.name.trim().split(/\s+/)[0]},`
    : "Hi there,";
  const memory =
    candidate.topics.length > 0
      ? `Lately you have been exploring <strong>${candidate.topics
          .slice(0, 3)
          .join(", ")}</strong>.`
      : "Your workspace still has room for a fresh idea today.";
  const streak =
    candidate.streakDays > 0
      ? `Your learning streak is at <strong>${candidate.streakDays}</strong> day${
          candidate.streakDays === 1 ? "" : "s"
        }.`
      : "A short session today can start a new streak.";
  const unsub = `${getConvexSiteUrl()}/email/unsubscribe?email=${encodeURIComponent(
    candidate.email
  )}&token=${encodeURIComponent(candidate.unsubscribeToken)}`;
  const ctaUrl = `${frontend}${theme.ctaPath}`;

  const html = wrapEmailHtml({
    title: theme.title,
    bodyHtml: `
      <p style="margin:0 0 12px;">${greet}</p>
      <p style="margin:0 0 12px;">${theme.lead}</p>
      <p style="margin:0 0 12px;">${memory} ${streak}</p>
      <ul style="margin:0 0 20px;padding-left:18px;">
        ${theme.bullets.map((b) => `<li style="margin:0 0 6px;">${b}</li>`).join("")}
      </ul>
      <p style="margin:0 0 8px;">
        <a href="${ctaUrl}"
           style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;">
          ${theme.ctaLabel}
        </a>
      </p>
    `,
    footerHtml: `
      <p style="margin:0;">You are getting occasional Giga3 updates because you have an account.</p>
      <p style="margin:8px 0 0;"><a href="${unsub}" style="color:#0f766e;">Unsubscribe from these emails</a></p>
    `,
  });

  const text = [
    greet.replace(/,$/, ""),
    theme.lead,
    candidate.topics.length
      ? `Topics you explored: ${candidate.topics.slice(0, 3).join(", ")}`
      : "",
    `${theme.ctaLabel}: ${ctaUrl}`,
    `Unsubscribe: ${unsub}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    subject: `${theme.title} · Giga3 AI`,
    html,
    text,
  };
}

/**
 * Occasional re-engagement digests for inactive opted-in users.
 * Scheduled from crons.ts (every few days).
 */
export const sendEngagementDigests = internalAction({
  args: {
    limit: v.optional(v.number()),
    minInactiveDays: v.optional(v.number()),
    minDaysSinceLastEmail: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!isEmailDeliveryConfigured()) {
      console.error("[engagementEmail] skipped — RESEND_API_KEY not configured");
      return { ok: false as const, reason: "not_configured", sent: 0, attempted: 0 };
    }

    const candidates = await ctx.runQuery(
      internal.engagementEmail.listEngagementCandidatesInternal,
      {
        limit: args.limit,
        minInactiveDays: args.minInactiveDays,
        minDaysSinceLastEmail: args.minDaysSinceLastEmail,
      }
    );

    let sent = 0;
    let failed = 0;

    for (const candidate of candidates as Candidate[]) {
      const ensured = await ctx.runMutation(
        internal.engagementEmail.ensureUnsubscribeTokenInternal,
        {
          email: candidate.email,
          unsubscribeToken: candidate.unsubscribeToken,
        }
      );
      const ready = { ...candidate, unsubscribeToken: ensured.token };
      const content = buildEngagementHtml(ready);
      const result = await sendEmail({
        to: ready.email,
        subject: content.subject,
        html: content.html,
        text: content.text,
        tags: [
          { name: "category", value: "engagement" },
          { name: "app", value: "giga3" },
        ],
      });

      if (result.ok) {
        sent += 1;
        await ctx.runMutation(
          internal.engagementEmail.markEngagementEmailSentInternal,
          {
            email: ready.email,
            unsubscribeToken: ready.unsubscribeToken,
          }
        );
      } else {
        failed += 1;
      }
    }

    return {
      ok: true as const,
      attempted: candidates.length,
      sent,
      failed,
    };
  },
});

/**
 * Branded major-feature announcement for opted-in users.
 *
 * Safety:
 * - mode "smoke" requires exactly one allowlisted recipient (never falls back to bulk).
 * - mode "bulk" (default, cron) scans candidates; sandbox / missing AUTH_FROM_EMAIL blocked.
 * - Aborts the batch on sandbox_recipient / domain_unverified.
 * - Bounded 429 retries; network_error marks uncertain (no blind resend).
 * - Campaign-key claim + sent/uncertain keys separate from digest lastEngagementEmailAt.
 * - sending:<campaign> is never auto-reclaimed after TTL (ops reconcile only).
 * - Uncertain/stuck claims: reconcileFeatureAnnouncementDeliveryInternal (internal only).
 *
 * Digests continue to use sendEngagementDigests + markEngagementEmailSentInternal unchanged.
 *
 * Schema (additive, optional fields — no destructive migration):
 * - users.lastFeatureAnnouncementAt
 * - users.lastFeatureAnnouncementCampaignKey
 *   values: "<campaign>" | "sending:<campaign>" | "uncertain:<campaign>"
 */
export const sendFeatureAnnouncementEmails = internalAction({
  args: {
    limit: v.optional(v.number()),
    minDaysSinceLastEmail: v.optional(v.number()),
    /**
     * "smoke" = single-recipient allowlist required (no bulk fallback).
     * "bulk" = scheduled/manual blast (default).
     */
    mode: v.optional(v.union(v.literal("smoke"), v.literal("bulk"))),
    /** Single-recipient smoke test (normalized + allowlisted server-side). */
    to: v.optional(v.string()),
    /** Explicit allowlist; combined with `to`. Max size enforced in safety helpers. */
    allowlist: v.optional(v.array(v.string())),
    /** Campaign idempotency key — successful/uncertain recipients skip the same key on retry. */
    campaignKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const empty = (reason: string) => ({
      ok: false as const,
      reason,
      sent: 0,
      failed: 0,
      attempted: 0,
      outcomes: [] as AnnouncementRecipientOutcome[],
    });

    if (!isEmailDeliveryConfigured()) {
      console.error("[featureEmail] skipped — RESEND_API_KEY not configured");
      return empty("not_configured");
    }

    const mode: AnnouncementSendMode = args.mode ?? "bulk";
    const allowlistResolved = resolveAnnouncementAllowlist(
      mode,
      args.to,
      args.allowlist
    );
    if (!allowlistResolved.ok) {
      console.error(`[featureEmail] invalid allowlist: ${allowlistResolved.reason}`);
      return empty(allowlistResolved.reason);
    }
    const allowlist = allowlistResolved.emails;

    // Smoke mode must never proceed without a concrete allowlist of one.
    if (mode === "smoke" && (!allowlist || allowlist.length !== 1)) {
      return empty("smoke_requires_exactly_one_recipient");
    }

    const campaignKey =
      (args.campaignKey?.trim() || DEFAULT_FEATURE_ANNOUNCEMENT_CAMPAIGN).slice(0, 80);

    const from = getAuthFromEmail();
    const authFromConfigured = isAuthFromEmailConfigured();
    const plannedCount =
      allowlist != null ? allowlist.length : Math.min(Math.max(args.limit ?? 40, 1), 80);
    const earlyPreflight = announcementSenderPreflight({
      from,
      authFromConfigured,
      effectiveRecipientCount: plannedCount,
      mode,
    });
    if (!earlyPreflight.ok) {
      console.error(`[featureEmail] preflight blocked: ${earlyPreflight.reason}`);
      return empty(earlyPreflight.reason);
    }

    const candidates = await ctx.runQuery(
      internal.engagementEmail.listAnnouncementCandidatesInternal,
      {
        limit: mode === "smoke" ? 1 : args.limit ?? 40,
        minDaysSinceLastEmail: args.minDaysSinceLastEmail ?? 10,
        campaignKey,
        allowlist: allowlist ?? undefined,
      }
    );

    // Defense in depth: drop anyone outside the allowlist even if the query misbehaves.
    const eligible = (candidates as Candidate[]).filter((c) =>
      isEmailInAllowlist(c.email, allowlist)
    );

    if (mode === "smoke") {
      // Never widen a smoke test to other candidates.
      if (eligible.length !== 1 || !allowlist || !isEmailInAllowlist(eligible[0].email, allowlist)) {
        return empty("smoke_recipient_not_eligible");
      }
    }

    const preflight = announcementSenderPreflight({
      from,
      authFromConfigured,
      effectiveRecipientCount: eligible.length,
      mode,
    });
    if (!preflight.ok) {
      console.error(`[featureEmail] preflight blocked: ${preflight.reason}`);
      return empty(preflight.reason);
    }

    let sent = 0;
    let failed = 0;
    const outcomes: AnnouncementRecipientOutcome[] = [];
    let abortedReason: string | undefined;

    for (const candidate of eligible) {
      if (allowlist && !isEmailInAllowlist(candidate.email, allowlist)) {
        outcomes.push({
          emailRedacted: redactEmail(candidate.email),
          status: "skipped",
          reason: "not_in_allowlist",
        });
        continue;
      }

      const claim = await ctx.runMutation(
        internal.engagementEmail.claimFeatureAnnouncementSendInternal,
        { email: candidate.email, campaignKey }
      );
      if (!claim.ok) {
        const skipReason =
          claim.reason === "already_sent_campaign" ||
          claim.reason === "uncertain_delivery" ||
          claim.reason === "in_flight" ||
          claim.reason === "opted_out"
            ? claim.reason
            : "claim_failed";
        outcomes.push({
          emailRedacted: redactEmail(candidate.email),
          status: "skipped",
          reason: skipReason,
        });
        continue;
      }

      const ensured = await ctx.runMutation(
        internal.engagementEmail.ensureUnsubscribeTokenInternal,
        {
          email: candidate.email,
          unsubscribeToken: candidate.unsubscribeToken,
        }
      );
      const ready = { ...candidate, unsubscribeToken: ensured.token };
      const content = buildFeatureAnnouncementHtml(ready);
      const result = await sendEmailWithBoundedRetry(
        {
          to: ready.email,
          subject: content.subject,
          html: content.html,
          text: content.text,
          tags: [
            { name: "category", value: "feature_announcement" },
            { name: "app", value: "giga3" },
          ],
        },
        { maxAttempts: ANNOUNCEMENT_429_MAX_ATTEMPTS }
      );

      if (result.ok) {
        sent += 1;
        await ctx.runMutation(
          internal.engagementEmail.markFeatureAnnouncementSentInternal,
          {
            email: ready.email,
            campaignKey,
            unsubscribeToken: ready.unsubscribeToken,
          }
        );
        outcomes.push({
          emailRedacted: redactEmail(ready.email),
          status: "sent",
        });
        continue;
      }

      failed += 1;
      const redacted = redactEmail(ready.email);
      console.error(
        `[featureEmail] send failed reason=${result.reason} to=${redacted} attempts=${result.attempts}`
      );

      if (isAmbiguousDeliveryFailure(result.reason)) {
        // Do not release claim or allow blind retry — acceptance is uncertain.
        await ctx.runMutation(
          internal.engagementEmail.markFeatureAnnouncementUncertainInternal,
          { email: ready.email, campaignKey }
        );
        outcomes.push({
          emailRedacted: redacted,
          status: "failed",
          reason: result.reason,
        });
      } else {
        await ctx.runMutation(
          internal.engagementEmail.releaseFeatureAnnouncementClaimInternal,
          { email: ready.email, campaignKey }
        );
        outcomes.push({
          emailRedacted: redacted,
          status: "failed",
          reason: result.reason,
        });
      }

      if (shouldAbortAnnouncementBatch(result.reason)) {
        abortedReason = result.reason;
        console.error(
          `[featureEmail] aborting batch after ${result.reason} (no further recipients)`
        );
        break;
      }
    }

    return {
      ok: !abortedReason,
      reason: abortedReason,
      mode,
      campaignKey,
      attempted: eligible.length,
      sent,
      failed,
      outcomes,
    };
  },
});
