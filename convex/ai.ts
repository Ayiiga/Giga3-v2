import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import OpenAI from "openai";

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

    if (!user || user.tokens <= 0) {
      throw new Error("Insufficient tokens. Please purchase more tokens.");
    }

    await ctx.runMutation(api.chat.saveMessage, {
      userId: email,
      message,
      role: "user",
    });

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: message }],
    });

    const aiContent =
      response?.choices?.[0]?.message?.content ?? String(response ?? "");

    await ctx.runMutation(api.chat.saveMessage, {
      userId: email,
      message: aiContent,
      role: "assistant",
    });

    const newTokens = await ctx.runMutation(api.users.deductToken, { email });

    return { content: aiContent, tokens: newTokens };
  },
});
