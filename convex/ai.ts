import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";

export const askAI = action({
  args: {
    email: v.string(),
    message: v.string(),
  },

  handler: async (ctx, args) => {
    const { email, message } = args;

    // Ensure user exists
    let user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .first();

    let userId = user?._id;
    if (!user) {
      userId = await ctx.db.insert("users", {
        email,
        tokens: 12,
        plan: "free",
      });
      user = { _id: userId, email, tokens: 12, plan: "free" } as any;
    }

    if (user.tokens <= 0) {
      throw new Error("Insufficient tokens. Please purchase more tokens.");
    }

    // Save user message
    await ctx.db.insert("chats", {
      userId: email,
      message,
      role: "user",
      createdAt: Date.now(),
    });

    // Call OpenAI securely on server
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: message }],
    });

    const aiContent =
      response?.choices?.[0]?.message?.content ?? String(response ?? "");

    // Save AI response
    await ctx.db.insert("chats", {
      userId: email,
      message: aiContent,
      role: "assistant",
      createdAt: Date.now(),
    });

    // Deduct one token
    const newTokens = Math.max(0, (user.tokens ?? 0) - 1);
    await ctx.db.patch(userId, { tokens: newTokens });

    return { content: aiContent, tokens: newTokens };
  },
});