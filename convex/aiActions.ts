"use node";

import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { completeChatWithFailover, trimChatMessages } from "./chatEngine";
import { getSystemPrompt } from "./aiModes";

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
      trimChatMessages(
        [
          { role: "system", content: getSystemPrompt("general") },
          { role: "user", content: message },
        ],
        4
      )
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
