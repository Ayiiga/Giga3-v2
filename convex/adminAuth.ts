import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { isPlatformAdminEmail } from "./platformAdmin";
import { sessionArgs } from "./validators";
import {
  createAdminSessionToken,
  isConfiguredAdminKey,
} from "./adminSessionAuth";

/**
 * Exchange a one-time admin key for a short-lived bearer session token.
 * Clients should store the token in sessionStorage — never in the URL.
 */
export const exchangeAdminKey = mutation({
  args: { adminKey: v.string() },
  handler: async (_ctx, args) => {
    const key = args.adminKey.trim();
    if (!isConfiguredAdminKey(key)) {
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
