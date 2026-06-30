"use node";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { createSessionToken } from "./sessionAuth";
import { verifySupabaseAccessToken } from "./supabaseAuth";
import { UnauthorizedError } from "./securityErrors";

/** Exchange a verified Supabase magic-link/OAuth token for a Giga3 session token. */
export const establishSessionFromSupabase = action({
  args: { supabaseAccessToken: v.string() },
  handler: async (ctx, args) => {
    const email = await verifySupabaseAccessToken(args.supabaseAccessToken);
    await ctx.runMutation(api.users.createUser, { email });
    const sessionToken = await createSessionToken(email);
    return { email, sessionToken };
  },
});

/** Bootstrap session after email sign-in (Convex path). */
export const establishSessionFromEmail = action({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!email.includes("@")) throw new UnauthorizedError();

    const created = await ctx.runMutation(api.users.createUser, { email });
    const sessionToken =
      typeof created === "object" && created && "sessionToken" in created
        ? String((created as { sessionToken: string }).sessionToken)
        : await createSessionToken(email);
    return { email, sessionToken };
  },
});
