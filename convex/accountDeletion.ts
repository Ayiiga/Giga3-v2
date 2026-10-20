/**
 * Self-service account deletion for signed-in users.
 * Ops-only wipe remains in cleanup.ts (internalMutation).
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { SECURITY_EVENT_TYPES } from "./securityMonitoring";

/** Same founder guard as ops cleanup — never wipe this inbox via product UI. */
const PROTECTED_EMAIL = "ayiiga3@gmail.com";

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Self-delete confirmation: typed email must match the authenticated session email.
 */
export function assertSelfAccountDeleteAllowed(
  sessionEmailRaw: string,
  confirmEmailRaw: string
): { ok: true; email: string } | { ok: false; reason: string } {
  const sessionEmail = normalizeEmail(sessionEmailRaw);
  const confirmEmail = normalizeEmail(confirmEmailRaw);
  if (!sessionEmail || !sessionEmail.includes("@")) {
    return { ok: false, reason: "invalid_session_email" };
  }
  if (!confirmEmail || !confirmEmail.includes("@")) {
    return { ok: false, reason: "invalid_confirm_email" };
  }
  if (sessionEmail !== confirmEmail) {
    return { ok: false, reason: "confirm_mismatch" };
  }
  if (sessionEmail === PROTECTED_EMAIL) {
    return { ok: false, reason: "protected_email" };
  }
  return { ok: true, email: sessionEmail };
}

function userFacingDeleteError(reason: string): string {
  switch (reason) {
    case "confirm_mismatch":
      return "Type your account email exactly to confirm deletion.";
    case "protected_email":
      return "This account cannot be deleted from Settings. Contact support.";
    case "invalid_confirm_email":
      return "Enter a valid email address to confirm.";
    default:
      return "Could not delete account. Sign in again and retry.";
  }
}

/**
 * Permanently delete the signed-in user's account.
 * Requires confirmEmail to match the session email. Revokes all sessions first.
 */
export const deleteMyAccount = mutation({
  args: {
    ...sessionArgs,
    confirmEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const sessionEmail = await requireSession(args.sessionToken, ctx);
    const allowed = assertSelfAccountDeleteAllowed(sessionEmail, args.confirmEmail);
    if (!allowed.ok) {
      throw new Error(userFacingDeleteError(allowed.reason));
    }
    const email = allowed.email;

    await ctx.runMutation(internal.users.revokeSessionsInternal, {
      email,
      reason: "user_delete_account",
    });

    let deletedCredentials = false;
    const creds = await ctx.db
      .query("userCredentials")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (creds) {
      await ctx.db.delete(creds._id);
      deletedCredentials = true;
    }

    let deletedConversations = 0;
    let deletedMessages = 0;
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .collect();
    for (const conversation of conversations) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversation._id)
        )
        .collect();
      for (const message of messages) {
        await ctx.db.delete(message._id);
        deletedMessages += 1;
      }
      await ctx.db.delete(conversation._id);
      deletedConversations += 1;
    }

    let deletedUser = false;
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (user) {
      await ctx.db.delete(user._id);
      deletedUser = true;
    }

    const now = Date.now();
    await ctx.db.insert("securityEvents", {
      eventType: SECURITY_EVENT_TYPES.SUSPICIOUS_ACTIVITY,
      severity: "medium",
      message: "User deleted their own account from Settings",
      emailHash: email.slice(0, 64),
      dateKey: new Date(now).toISOString().slice(0, 10),
      createdAt: now,
    });

    return {
      ok: true as const,
      email,
      deletedUser,
      deletedCredentials,
      deletedConversations,
      deletedMessages,
    };
  },
});
