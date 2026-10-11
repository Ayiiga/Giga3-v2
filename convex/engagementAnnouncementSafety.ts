/**
 * Pure helpers for safer feature-announcement delivery.
 * No I/O — unit-tested without invoking Resend or Convex actions.
 */

import type { EmailFailureReason } from "./emailClient";

/** Default campaign key for announcement idempotency (override via action args). */
export const DEFAULT_FEATURE_ANNOUNCEMENT_CAMPAIGN = "feature_announcement_v1";

/** Max allowlist size for a controlled smoke / retry batch. */
export const ANNOUNCEMENT_ALLOWLIST_MAX = 20;

/** Bounded 429 retries (attempts = 1 + retries). */
export const ANNOUNCEMENT_429_MAX_ATTEMPTS = 3;
export const ANNOUNCEMENT_429_BACKOFF_MS = [400, 900, 1600] as const;

export type AnnouncementOutcomeStatus =
  | "sent"
  | "failed"
  | "skipped"
  | "aborted";

export type AnnouncementRecipientOutcome = {
  /** Redacted address only — never full email in returned payloads. */
  emailRedacted: string;
  status: AnnouncementOutcomeStatus;
  reason?: EmailFailureReason | "not_in_allowlist" | "already_sent_campaign" | "opted_out" | "batch_aborted";
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

/**
 * Build a normalized allowlist from `to` and/or `allowlist`.
 * Returns null when neither is provided (bulk candidate scan mode).
 */
export function resolveAnnouncementAllowlist(
  to?: string | null,
  allowlist?: string[] | null
): { ok: true; emails: string[] | null } | { ok: false; reason: string } {
  const raw: string[] = [];
  if (typeof to === "string" && to.trim()) raw.push(to);
  if (Array.isArray(allowlist)) {
    for (const entry of allowlist) {
      if (typeof entry === "string" && entry.trim()) raw.push(entry);
    }
  }
  if (raw.length === 0) return { ok: true, emails: null };

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

/**
 * Multi-recipient sends require a verified-domain From address.
 * A single-recipient allowlist smoke test may use the sandbox sender
 * (Resend only delivers to the account owner in that mode).
 */
export function announcementSenderPreflight(
  from: string,
  effectiveRecipientCount: number
): { ok: true } | { ok: false; reason: "sandbox_sender_blocks_multi" | "empty_recipients" } {
  if (effectiveRecipientCount <= 0) {
    return { ok: false, reason: "empty_recipients" };
  }
  if (effectiveRecipientCount > 1 && isResendSandboxSender(from)) {
    return { ok: false, reason: "sandbox_sender_blocks_multi" };
  }
  return { ok: true };
}

export function shouldAbortAnnouncementBatch(
  reason: EmailFailureReason | undefined
): boolean {
  return reason === "sandbox_recipient" || reason === "domain_unverified";
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
