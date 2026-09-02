"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { createSessionToken } from "./sessionAuth";
import { verifySupabaseAccessToken } from "./supabaseAuth";
import { UnauthorizedError } from "./securityErrors";

/** Exchange a verified Supabase magic-link/OAuth token for a Giga3 session token. */
export const establishSessionFromSupabase = action({
  args: { supabaseAccessToken: v.string() },
  handler: async (ctx, args) => {
    const email = await verifySupabaseAccessToken(args.supabaseAccessToken);
    await ctx.runMutation(internal.users.ensureUserInternal, { email });
    const sessionToken = await createSessionToken(email);
    return { email, sessionToken };
  },
});

/**
 * @deprecated Issued a session from a bare email address (no proof of
 * ownership). Disabled; kept so old clients receive a clear error instead of a
 * missing-function failure. Use password sign-in or the emailed reset link.
 */
export const establishSessionFromEmail = action({
  args: { email: v.string() },
  handler: async () => {
    throw new UnauthorizedError(
      "Email-only sign-in is no longer available. Sign in with your password, or use “Forgot password” to set one."
    );
  },
});
