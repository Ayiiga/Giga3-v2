import { action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import OpenAI from "openai";
import { getSystemPrompt, isValidMode } from "./aiModes";

const openai = () =>
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

export const appendMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: args.userId,
      role: args.role,
      content: args.content,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.conversationId, { updatedAt: Date.now() });
  },
});

export const sendMessage = action({
  args: {
    userId: v.string(),
    conversationId: v.id("conversations"),
    content: v.string(),
    mode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const conv = await ctx.runQuery(api.conversations.get, {
      conversationId: args.conversationId,
      userId: args.userId,
    });
    if (!conv) throw new Error("Conversation not found");

    let user = await ctx.runQuery(api.users.getUser, { email: args.userId });
    if (!user) {
      await ctx.runMutation(api.users.createUser, { email: args.userId });
      user = await ctx.runQuery(api.users.getUser, { email: args.userId });
    }
    if (!user || user.tokens <= 0) {
      throw new Error("Insufficient tokens. Please purchase more tokens.");
    }

    const mode =
      args.mode && isValidMode(args.mode) ? args.mode : conv.mode ?? "general";
    if (mode !== conv.mode) {
      await ctx.runMutation(api.conversations.setMode, {
        conversationId: args.conversationId,
        userId: args.userId,
        mode,
      });
    }

    await ctx.runMutation(internal.platform.appendMessage, {
      conversationId: args.conversationId,
      userId: args.userId,
      role: "user",
      content: args.content,
    });

    const history = await ctx.runQuery(api.messages.listByConversation, {
      conversationId: args.conversationId,
      userId: args.userId,
    });

    const systemPrompt = getSystemPrompt(mode);
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const response = await openai().chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: openaiMessages,
      temperature: 0.7,
    });

    const assistantContent =
      response.choices[0]?.message?.content?.trim() ||
      "I could not generate a response.";

    await ctx.runMutation(internal.platform.appendMessage, {
      conversationId: args.conversationId,
      userId: args.userId,
      role: "assistant",
      content: assistantContent,
    });

    const newTokens = await ctx.runMutation(api.users.deductToken, {
      email: args.userId,
    });

    const title =
      conv.title === "New chat" || conv.title.endsWith("…")
        ? args.content.slice(0, 48).trim() + (args.content.length > 48 ? "…" : "")
        : conv.title;

    if (title !== conv.title) {
      await ctx.runMutation(api.conversations.updateTitle, {
        conversationId: args.conversationId,
        userId: args.userId,
        title,
      });
    }

    return {
      content: assistantContent,
      tokens: newTokens,
      mode,
    };
  },
});
