/**
 * Welcome-email claim/mark helpers used by internal mutations.
 * Single-document read+write inside one Convex mutation = atomic under OCC.
 * Competing mutations that race on the same user document conflict; Convex
 * retries the loser, which then observes the winner's "sending"/"sent"/
 * "uncertain" status and declines. No JS mutex; no auto-reclaim of "sending".
 */

import type { MutationCtx } from "./_generated/server";
import { evaluateWelcomeEmailClaim } from "./engagementAnnouncementSafety";

export type WelcomeClaimResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_found" | "already_sent" | "in_flight" | "uncertain_delivery";
    };

/** Atomic claim: gate + patch in the same mutation transaction. */
export async function claimWelcomeEmailSendInTxn(
  ctx: MutationCtx,
  emailRaw: string
): Promise<WelcomeClaimResult> {
  const email = emailRaw.trim().toLowerCase();
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
  if (!user) return { ok: false, reason: "not_found" };

  const gate = evaluateWelcomeEmailClaim(user.welcomeEmailStatus);
  if (!gate.ok) {
    return { ok: false, reason: gate.reason };
  }

  // Patch only after gate in the same txn. Convex OCC retries the whole
  // mutation if another writer committed to this document first.
  await ctx.db.patch(user._id, {
    welcomeEmailStatus: "sending",
    welcomeEmailAt: Date.now(),
  });
  return { ok: true };
}

export type WelcomeMarkResult = { ok: true } | { ok: false; reason: "not_found" | "not_sending" };

async function markWelcomeFromSending(
  ctx: MutationCtx,
  emailRaw: string,
  status: "sent" | "uncertain" | "failed"
): Promise<WelcomeMarkResult> {
  const email = emailRaw.trim().toLowerCase();
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
  if (!user) return { ok: false, reason: "not_found" };
  // Only the successful claimant (status=sending) may finalize. Prevents
  // out-of-order mark from a stale delivery path.
  if (user.welcomeEmailStatus !== "sending") {
    return { ok: false, reason: "not_sending" };
  }
  await ctx.db.patch(user._id, {
    welcomeEmailStatus: status,
    welcomeEmailAt: Date.now(),
  });
  return { ok: true };
}

export function markWelcomeEmailSentInTxn(ctx: MutationCtx, email: string) {
  return markWelcomeFromSending(ctx, email, "sent");
}

export function markWelcomeEmailUncertainInTxn(ctx: MutationCtx, email: string) {
  return markWelcomeFromSending(ctx, email, "uncertain");
}

export function markWelcomeEmailFailedInTxn(ctx: MutationCtx, email: string) {
  return markWelcomeFromSending(ctx, email, "failed");
}
