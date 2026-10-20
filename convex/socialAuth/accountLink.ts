/**
 * Pure social-account linking policy.
 *
 * Stable identifier is provider `subject`. Email is never enough to merge
 * accounts — an existing email without this provider linked requires an
 * authenticated link flow (session + matching verified email).
 */

import type { SocialAuthProvider } from "./types";

export type SocialLinkAccount = {
  userId: string;
  suspended: boolean;
};

export type SocialLinkRejectCode =
  | "invalid_identity"
  | "unverified_email"
  | "suspended"
  | "account_exists_requires_link"
  | "linked_to_other_account"
  | "email_mismatch_for_link"
  | "already_linked_other_subject";

export type SocialLinkDecision =
  | { kind: "create"; email: string }
  | { kind: "sign-in"; email: string }
  | { kind: "link"; email: string }
  | { kind: "reject"; code: SocialLinkRejectCode };

function clean(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export function socialLinkRejectionMessage(code: SocialLinkRejectCode): string {
  switch (code) {
    case "unverified_email":
      return "This provider has not verified the email address. Use a verified account, or sign in with your password.";
    case "suspended":
      return "This account has been suspended. Contact support.";
    case "account_exists_requires_link":
      return "An account with this email already exists. Sign in with your password, then link this provider from Settings.";
    case "linked_to_other_account":
      return "This provider account is already linked to a different Giga3 user.";
    case "email_mismatch_for_link":
      return "The provider email does not match your signed-in account. Sign in with the matching account, or use a different provider account.";
    case "already_linked_other_subject":
      return "This account is already linked to a different identity for this provider.";
    default:
      return "Sign-in could not be completed.";
  }
}

/**
 * Map a verified provider identity onto Giga3 for sign-up / sign-in
 * (not the authenticated link flow).
 */
export function decideSocialAccountLink(input: {
  provider: SocialAuthProvider;
  subject: string;
  email: string;
  emailVerified: boolean;
  bySubject: SocialLinkAccount | null;
  byEmail: SocialLinkAccount | null;
}): SocialLinkDecision {
  const subject = input.subject.trim();
  const email = clean(input.email);
  if (!subject || subject.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { kind: "reject", code: "invalid_identity" };
  }
  if (input.emailVerified !== true) {
    return { kind: "reject", code: "unverified_email" };
  }

  if (input.bySubject) {
    if (input.bySubject.suspended) return { kind: "reject", code: "suspended" };
    return { kind: "sign-in", email: clean(input.bySubject.userId) };
  }

  if (input.byEmail) {
    if (input.byEmail.suspended) return { kind: "reject", code: "suspended" };
    // Never auto-merge solely because emails match.
    return { kind: "reject", code: "account_exists_requires_link" };
  }

  return { kind: "create", email };
}

/**
 * Explicit link: caller already proved ownership of `sessionUserId` via session.
 * Provider identity email must match the session account.
 */
export function decideSocialExplicitLink(input: {
  subject: string;
  email: string;
  emailVerified: boolean;
  sessionUserId: string;
  bySubject: SocialLinkAccount | null;
  existingSubjectForUser: string | null;
}): SocialLinkDecision {
  const subject = input.subject.trim();
  const email = clean(input.email);
  const sessionUserId = clean(input.sessionUserId);
  if (!subject || !sessionUserId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { kind: "reject", code: "invalid_identity" };
  }
  if (input.emailVerified !== true) {
    return { kind: "reject", code: "unverified_email" };
  }
  if (email !== sessionUserId) {
    return { kind: "reject", code: "email_mismatch_for_link" };
  }
  if (input.bySubject) {
    if (clean(input.bySubject.userId) !== sessionUserId) {
      return { kind: "reject", code: "linked_to_other_account" };
    }
    return { kind: "sign-in", email: sessionUserId };
  }
  const existing = input.existingSubjectForUser?.trim() || null;
  if (existing && existing !== subject) {
    return { kind: "reject", code: "already_linked_other_subject" };
  }
  return { kind: "link", email: sessionUserId };
}
