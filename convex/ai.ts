import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { applyStarterGrantIfNeeded } from "./creditsLogic";

export const persistLegacyChat = internalMutation({
  args: {
    email: v.string(),
    userMessage: v.string(),
    assistantMessage: v.string(),
    newTokens: v.number(),
  },
  handler: async (ctx, args) => {
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      const userId = await ctx.db.insert("users", {
        email: args.email,
        tokens: 12,
        plan: "free",
        tier: "free",
        subscriptionPlan: "free",
        credits: 0,
        starterCreditsGranted: false,
      });
      user = await ctx.db.get(userId);
      if (!user) throw new Error("Failed to create user");
      await applyStarterGrantIfNeeded(ctx, user, async (entry) => {
        await ctx.db.insert("creditLogs", {
          userId: entry.userId,
          action: entry.action,
          amount: entry.amount,
          balanceAfter: entry.balanceAfter,
          reference: entry.reference,
          createdAt: Date.now(),
        });
      });
    }

    await ctx.db.insert("chats", {
      userId: args.email,
      message: args.userMessage,
      role: "user",
      createdAt: Date.now(),
    });

    await ctx.db.insert("chats", {
      userId: args.email,
      message: args.assistantMessage,
      role: "assistant",
      createdAt: Date.now(),
    });

    await ctx.db.patch(user._id, { tokens: args.newTokens });
    return { tokens: args.newTokens };
  },
});
