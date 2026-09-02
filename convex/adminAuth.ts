import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { isPlatformAdminEmail } from "./platformAdmin";
import { sessionArgs } from "./validators";
import {
  createAdminSessionToken,
  isConfiguredAdminKey,
} from "./adminSessionAuth";
import { consumeAuthRateLimit } from "./authRateLimit";
import { SECURITY_EVENT_TYPES } from "./securityMonitoring";

/** Global brute-force guard: the static key is one secret for the whole deployment. */
const ADMIN_KEY_ATTEMPTS_PER_15_MIN = 10;

/**
 * Exchange a one-time admin key for a short-lived bearer session token.
 * Clients should store the token in sessionStorage — never in the URL.
 */
export const exchangeAdminKey = mutation({
  args: { adminKey: v.string() },
  handler: async (ctx, args) => {
    await consumeAuthRateLimit(ctx, "admin:exchange-key", ADMIN_KEY_ATTEMPTS_PER_15_MIN);
    const key = args.adminKey.trim();
    if (!isConfiguredAdminKey(key)) {
      await ctx.db.insert("securityEvents", {
        eventType: SECURITY_EVENT_TYPES.AUTH_FORBIDDEN,
        severity: "high",
        message: "Invalid admin key presented",
        dateKey: new Date().toISOString().slice(0, 10),
        createdAt: Date.now(),
      });
      throw new Error("Unauthorized");
    }
    const adminSessionToken = await createAdminSessionToken();
    return {
      adminSessionToken,
      expiresInMs: 8 * 60 * 60 * 1000,
    };
  },
});

/** Issue an admin session when the signed-in user is a configured platform administrator. */
export const exchangeUserSessionForAdmin = mutation({
  args: sessionArgs,
  handler: async (_ctx, args) => {
    const email = await requireSession(args.sessionToken);
    if (!isPlatformAdminEmail(email)) {
      throw new Error("Unauthorized");
    }
    const adminSessionToken = await createAdminSessionToken();
    return {
      adminSessionToken,
      expiresInMs: 8 * 60 * 60 * 1000,
      email,
    };
  },
});

export const isCurrentUserPlatformAdmin = query({
  args: sessionArgs,
  handler: async (_ctx, args) => {
    try {
      const email = await requireSession(args.sessionToken);
      return { isAdmin: isPlatformAdminEmail(email), email };
    } catch {
      return { isAdmin: false, email: null as string | null };
    }
  },
});
