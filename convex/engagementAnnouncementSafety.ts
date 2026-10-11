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
