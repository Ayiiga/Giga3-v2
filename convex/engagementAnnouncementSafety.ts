/**
 * Pure helpers for safer feature-announcement delivery.
 * No I/O — unit-tested without invoking Resend or Convex actions.
 */

import type { EmailFailureReason } from "./emailClient";

/** Default campaign key for announcement idempotency (override via action args). */
export const DEFAULT_FEATURE_ANNOUNCEMENT_CAMPAIGN = "feature_announcement_v1";

/** Max allowlist size for a controlled retry batch (smoke mode allows exactly 1). */
export const ANNOUNCEMENT_ALLOWLIST_MAX = 20;

/** Bounded 429 retries (attempts include the first try). */
export const ANNOUNCEMENT_429_MAX_ATTEMPTS = 3;
export const ANNOUNCEMENT_429_BACKOFF_MS = [400, 900, 1600] as const;

/**
 * In-flight claim staleness signal only (ops / observability).
 * Expired sending claims stay blocked — they are never auto-reclaimed for Resend.
 */
export const ANNOUNCEMENT_CLAIM_TTL_MS = 15 * 60 * 1000;

export type AnnouncementReconcileDecision = "confirm_sent" | "release_for_retry";

/** Affirmative non-delivery evidence required before release_for_retry. */
export type AnnouncementNonDeliveryEvidence =
  | "provider_confirmed_not_accepted"
  | "provider_confirmed_failed";

export type AnnouncementReconcileRejectReason =
  | "invalid_email"
  | "invalid_campaign"
  | "invalid_decision"
  | "missing_ops_reason"
  | "missing_non_delivery_evidence"
  | "not_found"
  | "opted_out"
  | "already_sent"
  | "not_reconcilable"
  | "campaign_mismatch";

export type AnnouncementSendMode = "smoke" | "bulk";

export type AnnouncementOutcomeStatus =
  | "sent"
  | "failed"
  | "skipped"
  | "aborted";

export type AnnouncementRecipientOutcome = {
  /** Redacted address only — never full email in returned payloads. */
  emailRedacted: string;
  status: AnnouncementOutcomeStatus;
  reason?:
    | EmailFailureReason
    | "not_in_allowlist"
    | "already_sent_campaign"
    | "uncertain_delivery"
    | "in_flight"
    | "opted_out"
    | "batch_aborted"
    | "claim_failed";
};

export function redactEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.indexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return "***";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const localRedacted =
    local.length <= 1 ? "*" : `${local[0]}***${local[local.length - 1]}`;
  return `${localRedacted}@${domain}`;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function campaignSendingKey(campaignKey: string): string {
  return `sending:${campaignKey}`;
}

export function campaignUncertainKey(campaignKey: string): string {
  return `uncertain:${campaignKey}`;
}

/**
 * True when this campaign was already accepted, is in-flight, or has uncertain delivery.
 * `sending:<campaign>` stays blocked forever for auto-send (including after TTL).
 * TTL is exposed separately via `isStaleSendingClaim` for ops, not auto-reclaim.
 */
export function isCampaignBlockedForRecipient(
  storedKey: string | undefined | null,
  campaignKey: string,
  _storedAt?: number | null,
  _now = Date.now()
): "sent" | "uncertain" | "in_flight" | null {
  if (!storedKey) return null;
  if (storedKey === campaignKey) return "sent";
  if (storedKey === campaignUncertainKey(campaignKey)) return "uncertain";
  if (storedKey === campaignSendingKey(campaignKey)) return "in_flight";
  return null;
}

/** Observability only — does not unlock claims for another Resend attempt. */
export function isStaleSendingClaim(
  storedKey: string | undefined | null,
  campaignKey: string,
  storedAt: number | undefined | null,
  now = Date.now()
): boolean {
  if (storedKey !== campaignSendingKey(campaignKey)) return false;
  if (storedAt == null) return true;
  return now - storedAt >= ANNOUNCEMENT_CLAIM_TTL_MS;
}

/**
 * Sanitize freeform ops reasons for logs/returns.
 * Strips newlines, redacts email-shaped tokens, caps length — never log secrets.
 */
export function sanitizeOpsReason(reason: string, max = 200): string {
  return reason
    .replace(/\r?\n/g, " ")
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[redacted-email]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/**
 * Pure validation for reconcile transitions (unit-tested without DB).
 * Caller still re-checks atomically inside the internal mutation.
 */
export function evaluateAnnouncementReconcile(input: {
  email: string;
  campaignKey: string;
  decision: AnnouncementReconcileDecision | string;
  opsReason: string;
  nonDeliveryEvidence?: AnnouncementNonDeliveryEvidence | string | null;
  storedKey: string | undefined | null;
}):
  | { ok: true; decision: AnnouncementReconcileDecision; opsReason: string }
  | { ok: false; reason: AnnouncementReconcileRejectReason } {
  const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, reason: "invalid_email" };
  }
  const campaignKey = input.campaignKey.trim();
  if (!campaignKey) return { ok: false, reason: "invalid_campaign" };

  if (input.decision !== "confirm_sent" && input.decision !== "release_for_retry") {
    return { ok: false, reason: "invalid_decision" };
  }

  const opsReason = sanitizeOpsReason(input.opsReason);
  if (opsReason.length < 3) return { ok: false, reason: "missing_ops_reason" };

  if (input.decision === "release_for_retry") {
    const evidence = input.nonDeliveryEvidence;
    if (
      evidence !== "provider_confirmed_not_accepted" &&
      evidence !== "provider_confirmed_failed"
    ) {
      return { ok: false, reason: "missing_non_delivery_evidence" };
    }
  }

  const stored = input.storedKey ?? "";
  if (stored === campaignKey) return { ok: false, reason: "already_sent" };
  const sending = campaignSendingKey(campaignKey);
  const uncertain = campaignUncertainKey(campaignKey);
  if (stored !== sending && stored !== uncertain) {
    if (stored.startsWith("sending:") || stored.startsWith("uncertain:")) {
      return { ok: false, reason: "campaign_mismatch" };
    }
    return { ok: false, reason: "not_reconcilable" };
  }

  return { ok: true, decision: input.decision, opsReason };
}

/**
 * Build a normalized allowlist from `to` and/or `allowlist`.
 *
 * - mode "smoke": requires exactly one valid email; never returns bulk (null).
 * - mode "bulk": null allowlist means scan candidates; empty explicit list fails closed.
 */
export function resolveAnnouncementAllowlist(
  mode: AnnouncementSendMode,
  to?: string | null,
  allowlist?: string[] | null
): { ok: true; emails: string[] | null } | { ok: false; reason: string } {
  const allowlistProvided = Array.isArray(allowlist);
  const raw: string[] = [];
  if (typeof to === "string" && to.trim()) raw.push(to);
  if (allowlistProvided) {
    for (const entry of allowlist!) {
      if (typeof entry === "string" && entry.trim()) raw.push(entry);
    }
  }

  if (mode === "smoke") {
    if (raw.length === 0) {
      return { ok: false, reason: "smoke_requires_single_recipient" };
    }
  } else if (raw.length === 0) {
    // Bulk with no targeting → candidate scan. Explicit empty allowlist fails closed.
    if (allowlistProvided && allowlist!.length === 0 && !(typeof to === "string" && to.trim())) {
      return { ok: false, reason: "empty_allowlist" };
    }
    return { ok: true, emails: null };
  }

  const seen = new Set<string>();
  const emails: string[] = [];
  for (const entry of raw) {
    const n = normalizeEmail(entry);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n)) {
      return { ok: false, reason: `invalid_email:${redactEmail(n)}` };
    }
    if (seen.has(n)) continue;
    seen.add(n);
    emails.push(n);
  }

  if (mode === "smoke") {
    if (emails.length !== 1) {
      return { ok: false, reason: "smoke_requires_exactly_one_recipient" };
    }
    return { ok: true, emails };
  }

  if (emails.length > ANNOUNCEMENT_ALLOWLIST_MAX) {
    return {
      ok: false,
      reason: `allowlist_too_large:max_${ANNOUNCEMENT_ALLOWLIST_MAX}`,
    };
  }
  return { ok: true, emails };
}

/** True when From still uses Resend's testing sender. */
export function isResendSandboxSender(from: string): boolean {
  return /onboarding@resend\.dev/i.test(from);
}

export function isAuthFromEmailConfigured(
  envValue: string | undefined | null = process.env.AUTH_FROM_EMAIL
): boolean {
  return Boolean(envValue?.trim());
}

/**
 * Multi-recipient / bulk sends require AUTH_FROM_EMAIL to be set and not the
 * Resend onboarding sandbox address. Single-recipient smoke may use sandbox
 * (Resend only delivers to the account owner in that mode).
 */
export function announcementSenderPreflight(input: {
  from: string;
  authFromConfigured: boolean;
  effectiveRecipientCount: number;
  mode: AnnouncementSendMode;
}):
  | { ok: true }
  | {
      ok: false;
      reason:
        | "sandbox_sender_blocks_multi"
        | "auth_from_email_missing"
        | "empty_recipients";
    } {
  if (input.effectiveRecipientCount <= 0) {
    return { ok: false, reason: "empty_recipients" };
  }
  const multi =
    input.mode === "bulk" || input.effectiveRecipientCount > 1;
  if (multi && !input.authFromConfigured) {
    return { ok: false, reason: "auth_from_email_missing" };
  }
  if (multi && isResendSandboxSender(input.from)) {
    return { ok: false, reason: "sandbox_sender_blocks_multi" };
  }
  return { ok: true };
}

export function shouldAbortAnnouncementBatch(
  reason: EmailFailureReason | undefined
): boolean {
  return reason === "sandbox_recipient" || reason === "domain_unverified";
}

/** Failures where acceptance is uncertain — do not blindly resend. */
export function isAmbiguousDeliveryFailure(
  reason: EmailFailureReason | undefined
): boolean {
  return reason === "network_error";
}

export function filterEmailsToAllowlist(
  emails: string[],
  allowlist: string[] | null
): string[] {
  if (!allowlist) return emails;
  const allowed = new Set(allowlist.map(normalizeEmail));
  return emails.filter((e) => allowed.has(normalizeEmail(e)));
}

export function isEmailInAllowlist(
  email: string,
  allowlist: string[] | null
): boolean {
  if (!allowlist) return true;
  const n = normalizeEmail(email);
  return allowlist.some((a) => a === n);
}

export function backoffMsFor429Attempt(attemptIndexZeroBased: number): number {
  const idx = Math.min(
    Math.max(attemptIndexZeroBased, 0),
    ANNOUNCEMENT_429_BACKOFF_MS.length - 1
  );
  return ANNOUNCEMENT_429_BACKOFF_MS[idx];
}

// ---------------------------------------------------------------------------
// Shared eligibility / segmentation / tip campaign keys (Scope A — pure only)
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

/** Interest buckets used for digest themes and announcement/tip copy. */
export type InterestSegment = "learn" | "create" | "social" | "general";

/** Reusable tip campaign keys: tip_<feature>_v<n> (stored in lastFeatureAnnouncementCampaignKey). */
export const TIP_CAMPAIGN_PREFIX = "tip_";

export type TipFeatureSlug = "gigalearn" | "gigaedit" | "gigasocial" | "general";

export function tipCampaignKey(feature: TipFeatureSlug, version = 1): string {
  const v = Math.max(1, Math.floor(version));
  return `${TIP_CAMPAIGN_PREFIX}${feature}_v${v}`;
}

export function isTipCampaignKey(campaignKey: string): boolean {
  return /^tip_[a-z0-9]+_v\d+$/i.test(campaignKey.trim());
}

export function tipFeatureFromCampaignKey(
  campaignKey: string
): TipFeatureSlug | null {
  const m = campaignKey.trim().toLowerCase().match(/^tip_([a-z0-9]+)_v\d+$/);
  if (!m) return null;
  const slug = m[1];
  if (
    slug === "gigalearn" ||
    slug === "gigaedit" ||
    slug === "gigasocial" ||
    slug === "general"
  ) {
    return slug;
  }
  return null;
}

export function interestSegmentFromTipFeature(
  feature: TipFeatureSlug
): InterestSegment {
  switch (feature) {
    case "gigalearn":
      return "learn";
    case "gigaedit":
      return "create";
    case "gigasocial":
      return "social";
    default:
      return "general";
  }
}

export function resolveInterestSegment(
  topics: string[] | undefined | null,
  role?: string | null
): InterestSegment {
  const topicPart = (topics ?? []).map((t) => t.toLowerCase()).join(" ");
  const joined = `${topicPart} ${(role ?? "").toLowerCase()}`;
  if (/learn|study|exam|school|education|teacher|student/.test(joined)) {
    return "learn";
  }
  if (/creat|design|image|video|edit|media|art/.test(joined)) {
    return "create";
  }
  if (/fun|entertain|music|story|social|game/.test(joined)) {
    return "social";
  }
  return "general";
}

/** True when last engagement mail is still inside the cooldown window. */
export function isWithinEngagementCooldown(
  lastEngagementEmailAt: number | null | undefined,
  minDaysSinceLastEmail: number,
  now = Date.now()
): boolean {
  if (lastEngagementEmailAt == null) return false;
  const days = Math.max(0, minDaysSinceLastEmail);
  return lastEngagementEmailAt > now - days * DAY_MS;
}

export type EngagementEligibilityReject =
  | "opted_out"
  | "suspended"
  | "cooldown";

/**
 * Shared audience gate for digests / tips / announcements (opt-in + cooldown).
 * Campaign-key blocking stays in isCampaignBlockedForRecipient / claim path.
 */
export function evaluateEngagementEligibility(input: {
  emailEngagementOptIn?: boolean | null;
  accountStatus?: string | null;
  lastEngagementEmailAt?: number | null;
  minDaysSinceLastEmail: number;
  now?: number;
}): { ok: true } | { ok: false; reason: EngagementEligibilityReject } {
  if (input.accountStatus === "suspended") {
    return { ok: false, reason: "suspended" };
  }
  if (input.emailEngagementOptIn === false) {
    return { ok: false, reason: "opted_out" };
  }
  if (
    isWithinEngagementCooldown(
      input.lastEngagementEmailAt,
      input.minDaysSinceLastEmail,
      input.now ?? Date.now()
    )
  ) {
    return { ok: false, reason: "cooldown" };
  }
  return { ok: true };
}

export type FeatureEmailCopy = {
  title: string;
  lead: string;
  ctaLabel: string;
  ctaPath: string;
  bullets: string[];
  /** Short subject fragment after the product name. */
  subjectLine: string;
};

/** Digest / inactive-reminder theme copy (unchanged messaging, shared segmenter). */
export function digestCopyForSegment(segment: InterestSegment): FeatureEmailCopy {
  switch (segment) {
    case "learn":
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
        subjectLine: "Your next learning streak is waiting",
      };
    case "create":
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
        subjectLine: "Make something new in minutes",
      };
    case "social":
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
        subjectLine: "Come back for entertainment & community",
      };
    default:
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
        subjectLine: "New on Giga3 AI — faster Social, smarter remix",
      };
  }
}

/** Feature-announcement copy segmented by interest (default campaign). */
export function announcementCopyForSegment(
  segment: InterestSegment
): FeatureEmailCopy {
  switch (segment) {
    case "learn":
      return {
        title: "What’s new in Giga3 AI",
        lead: "GigaLearn and chat now help you turn short sessions into clearer notes, quizzes, and explanations — built for Ghana classrooms and self-study.",
        ctaLabel: "Open GigaLearn",
        ctaPath: "/gigalearn/",
        bullets: [
          "Practice questions and lesson summaries in chat",
          "Keep strong answers in your workspace",
          "Build a daily learning streak",
        ],
        subjectLine: "What’s new in Giga3 AI · GigaLearn",
      };
    case "create":
      return {
        title: "What’s new in Giga3 AI",
        lead: "Media Studio and GigaEdit are ready for posters, clips, and Stories — generate, refine, and export without leaving Giga3.",
        ctaLabel: "Open GigaEdit",
        ctaPath: "/gigaedit/",
        bullets: [
          "Generate or edit images for your brand",
          "Timeline edits and exports in GigaEdit",
          "Share a Story on GigaSocial when you are ready",
        ],
        subjectLine: "What’s new in Giga3 AI · GigaEdit & Media",
      };
    case "social":
      return {
        title: "What’s new in Giga3 AI",
        lead: "We upgraded GigaSocial so your feed feels faster, works offline with content you already watched, and Remix keeps the original video in your take.",
        ctaLabel: "Explore GigaSocial",
        ctaPath: "/gigasocial/",
        bullets: [
          "Instant reopen for cached photos, videos, Reels & Stories",
          "Smarter lazy-loading and prefetch on slow networks",
          "Remix attaches source media, audio timing & attribution",
        ],
        subjectLine: "What’s new in Giga3 AI · GigaSocial upgrade",
      };
    default:
      return {
        title: "What’s new in Giga3 AI",
        lead: "Learn, create, and share in one place — GigaLearn, GigaEdit, and GigaSocial are ready when you are.",
        ctaLabel: "Open Giga3",
        ctaPath: "/",
        bullets: [
          "Study with GigaLearn and chat",
          "Create with Media Studio and GigaEdit",
          "Share Stories and Reels on GigaSocial",
        ],
        subjectLine: "What’s new in Giga3 AI",
      };
  }
}

/** Tip campaign copy — same claim path as announcements; distinct campaignKey per tip. */
export function tipCopyForFeature(feature: TipFeatureSlug): FeatureEmailCopy {
  switch (feature) {
    case "gigalearn":
      return {
        title: "Quick tip · GigaLearn",
        lead: "Ask chat for a short quiz on one topic you are studying, then save the best explanation to your workspace.",
        ctaLabel: "Try a practice question",
        ctaPath: "/gigalearn/",
        bullets: [
          "One focused prompt beats a long session",
          "Reuse saved answers as revision notes",
          "Come back tomorrow to keep your streak",
        ],
        subjectLine: "Tip · Get more from GigaLearn",
      };
    case "gigaedit":
      return {
        title: "Quick tip · GigaEdit",
        lead: "Start from a Media Studio still, then trim and caption in GigaEdit before you post.",
        ctaLabel: "Open GigaEdit",
        ctaPath: "/gigaedit/",
        bullets: [
          "Generate a base image first",
          "Edit on-device for trim and overlays",
          "Export when the cut feels right",
        ],
        subjectLine: "Tip · Faster edits in GigaEdit",
      };
    case "gigasocial":
      return {
        title: "Quick tip · GigaSocial",
        lead: "Watch a Reel once so it caches, then reopen it offline — Remix keeps the source video attached.",
        ctaLabel: "Open GigaSocial",
        ctaPath: "/gigasocial/",
        bullets: [
          "Cached feed and Stories reopen instantly",
          "Remix preserves attribution",
          "Post a Story when you are ready",
        ],
        subjectLine: "Tip · Offline-ready GigaSocial",
      };
    default:
      return {
        title: "Quick tip · Giga3 AI",
        lead: "Pick one surface today — learn, create, or share — and finish a small task in under ten minutes.",
        ctaLabel: "Open Giga3",
        ctaPath: "/",
        bullets: [
          "GigaLearn for a short study burst",
          "GigaEdit for a quick creative cut",
          "GigaSocial to share what you made",
        ],
        subjectLine: "Tip · Make the most of Giga3",
      };
  }
}

/**
 * Resolve announcement vs tip copy for a campaign key + recipient interests.
 * Tip keys use tip_* templates; other keys use segmented announcement copy.
 */
export function resolveCampaignEmailCopy(input: {
  campaignKey: string;
  topics?: string[] | null;
  role?: string | null;
}): FeatureEmailCopy {
  const segment = resolveInterestSegment(input.topics, input.role);
  if (isTipCampaignKey(input.campaignKey)) {
    const feature = tipFeatureFromCampaignKey(input.campaignKey);
    return tipCopyForFeature(feature ?? "general");
  }
  return announcementCopyForSegment(segment);
}
