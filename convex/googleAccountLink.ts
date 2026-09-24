/**
 * Pure Google account-linking policy.
 *
 * The stable identifier is Google's `sub` claim. Email is used only after the
 * ID token has been verified and Google has marked `email_verified`.
 * This module never creates a second account for an email that already exists.
 */

export type GoogleLinkAccount = {
  email: string;
  googleSub: string | null;
  suspended: boolean;
};

export type GoogleLinkRejectCode =
  | "invalid_identity"
  | "unverified_email"
  | "suspended"
  | "linked_to_other_google";

export type GoogleLinkDecision =
  | { kind: "create"; email: string }
  | { kind: "sign-in"; email: string }
  | { kind: "link"; email: string }
  | { kind: "reject"; code: GoogleLinkRejectCode };

function cleanSub(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function googleLinkRejectionMessage(code: GoogleLinkRejectCode): string {
  switch (code) {
    case "unverified_email":
      return "Google has not verified this email address. Use a verified Google account, or sign in with your password.";
    case "suspended":
      return "This account has been suspended. Contact support.";
    case "linked_to_other_google":
      return "This email is already linked to a different Google account. Sign in with that Google account or with your password.";
    default:
      return "Google sign-in could not be completed.";
  }
}

/**
 * Decide how a verified Google identity maps onto Giga3.
 *
 * - `sub` already stored → sign in to that account (do not follow a changed email).
 * - Same verified email, no Google link yet → link onto the existing account.
 * - Same verified email, different `sub` → reject. Never create a duplicate.
 * - No account → create one.
 */
export function decideGoogleAccountLink(input: {
  googleSub: string;
  email: string;
  emailVerified: boolean;
  bySub: GoogleLinkAccount | null;
  byEmail: GoogleLinkAccount | null;
}): GoogleLinkDecision {
  const googleSub = input.googleSub.trim();
  const email = input.email.trim().toLowerCase();
  if (!googleSub || googleSub.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { kind: "reject", code: "invalid_identity" };
  }
  if (input.emailVerified !== true) {
    return { kind: "reject", code: "unverified_email" };
  }

  if (input.bySub) {
    if (input.bySub.suspended) return { kind: "reject", code: "suspended" };
    return { kind: "sign-in", email: input.bySub.email.trim().toLowerCase() };
  }

  if (input.byEmail) {
    if (input.byEmail.suspended) return { kind: "reject", code: "suspended" };
    const existingSub = cleanSub(input.byEmail.googleSub);
    if (existingSub && existingSub !== googleSub) {
      return { kind: "reject", code: "linked_to_other_google" };
    }
    if (existingSub === googleSub) {
      return { kind: "sign-in", email: input.byEmail.email.trim().toLowerCase() };
    }
    return { kind: "link", email: input.byEmail.email.trim().toLowerCase() };
  }

  return { kind: "create", email };
}

/** Fill empty profile fields only. Never store a non-HTTPS picture URL. */
export function googleProfilePatch(input: {
  name?: string;
  picture?: string;
  existingName?: string;
  existingImage?: string;
}): { name?: string; image?: string } {
  const patch: { name?: string; image?: string } = {};
  const name = input.name?.replace(/[\u0000-\u001F]/g, "").trim().slice(0, 120);
  if (name && !input.existingName?.trim()) patch.name = name;
  const picture = input.picture?.trim() ?? "";
  if (
    picture &&
    !input.existingImage?.trim() &&
    picture.startsWith("https://") &&
    picture.length <= 2048 &&
    !picture.includes(" ")
  ) {
    patch.image = picture;
  }
  return patch;
}
