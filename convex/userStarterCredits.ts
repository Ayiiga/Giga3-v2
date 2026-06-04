import { internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { FREE_STARTER_CREDITS } from "./subscriptionPlans";
import type { Doc } from "./_generated/dataModel";

async function getUserByEmail(ctx: MutationCtx, email: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
}

/** Grants 25 starter credits once per user (idempotent). */
export async function grantStarterCreditsIfNeeded(
  ctx: MutationCtx,
  email: string,
  user: Doc<"users">
): Promise<Doc<"users">> {
  if (user.starterCreditsGranted) {
    return user;
  }

  const balance = user.credits ?? 0;
  await ctx.runMutation(internal.credits.grantCreditsInternal, {
    userId: email,
    credits: FREE_STARTER_CREDITS,
    action: "starter_grant",
    reference: "signup",
    setBalance: balance === 0,
  });

  await ctx.db.patch(user._id, { starterCreditsGranted: true });
  const updated = await ctx.db.get(user._id);
  if (!updated) {
    throw new Error("Failed to refresh user after starter grant");
  }
  return updated;
}

export const ensureStarterCredits = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await getUserByEmail(ctx, args.email);
    if (!user) return null;
    return await grantStarterCreditsIfNeeded(ctx, args.email, user);
  },
});
