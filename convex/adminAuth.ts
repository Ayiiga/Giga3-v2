import { mutation } from "./_generated/server";
import { v } from "convex/values";
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
