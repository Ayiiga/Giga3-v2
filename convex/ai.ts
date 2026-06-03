import { action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { completeChatWithFailover, trimChatMessages } from "./chatEngine";

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

export const askAI = action({
  args: {
    email: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const { email, message } = args;

    let user = await ctx.runQuery(api.users.getUser, { email });
    if (!user) {
      await ctx.runMutation(api.users.createUser, { email });
      user = await ctx.runQuery(api.users.getUser, { email });
    }
    if (!user) {
      throw new Error("User not found");
    }
    if (user.tokens <= 0) {
      throw new Error("Insufficient tokens. Please purchase more tokens.");
    }

    const engineResult = await completeChatWithFailover(
      trimChatMessages([{ role: "user", content: message }], 4)
    );

    const aiContent = engineResult.content;
    const chargedAi = engineResult.providerId !== "local_fallback";

    const newTokens = chargedAi ? Math.max(0, user.tokens - 1) : user.tokens;

    await ctx.runMutation(internal.ai.persistLegacyChat, {
      email,
      userMessage: message,
      assistantMessage: aiContent,
      newTokens,
    });

    return {
      content: aiContent,
      tokens: newTokens,
      usedFallback: engineResult.usedFallback,
      chatProvider: engineResult.providerId,
    };
  },
});
