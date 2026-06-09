"use node";

import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import {
  completeChatWithFailover,
  getChatProviderLabel,
  trimChatMessages,
} from "./chatEngine";
import { getSystemPrompt, isValidMode } from "./aiModes";
import { buildInterestSystemAddon, parseInterestProfile } from "./userLearning";

export const sendMessage = action({
  args: {
    userId: v.string(),
    conversationId: v.id("conversations"),
    content: v.string(),
    mode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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

    await ctx.runMutation(api.users.recordChatInteraction, {
      email: args.userId,
      mode,
      messageContent: args.content,
    });

    const history = await ctx.runQuery(api.messages.listByConversation, {
      conversationId: args.conversationId,
      userId: args.userId,
    });

    const refreshedUser = await ctx.runQuery(api.users.getUser, {
      email: args.userId,
    });

    const systemPrompt =
      getSystemPrompt(mode) +
      buildInterestSystemAddon(parseInterestProfile(refreshedUser?.interestProfile));

    const chatMessages = trimChatMessages([
      { role: "system" as const, content: systemPrompt },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ]);

    const engineResult = await completeChatWithFailover(chatMessages);
    const assistantContent = engineResult.content;

    const chargedAi = engineResult.providerId !== "local_fallback";

    if (chargedAi) {
      await ctx.runMutation(api.credits.deductForChatMode, {
        userId: args.userId,
        mode,
        reference: args.conversationId,
      });
    }

    await ctx.runMutation(internal.platform.appendMessage, {
      conversationId: args.conversationId,
      userId: args.userId,
      role: "assistant",
      content: assistantContent,
    });

    const updatedUser = await ctx.runQuery(api.users.getUser, {
      email: args.userId,
    });

    const title =
      conv.title === "New chat" || conv.title.endsWith("…")
        ? args.content.slice(0, 48).trim() +
          (args.content.length > 48 ? "…" : "")
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
      credits: updatedUser?.credits ?? 0,
      mode,
      chatProvider: engineResult.providerId,
      chatProviderLabel: getChatProviderLabel(engineResult.providerId),
      usedFallback: engineResult.usedFallback,
    };
  },
});

export const regenerateMessage = action({
  args: {
    userId: v.string(),
    conversationId: v.id("conversations"),
    assistantMessageId: v.id("messages"),
    mode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.runQuery(api.conversations.get, {
      conversationId: args.conversationId,
      userId: args.userId,
    });
    if (!conv) throw new Error("Conversation not found");

    const history = await ctx.runQuery(api.messages.listByConversation, {
      conversationId: args.conversationId,
      userId: args.userId,
    });
    const targetIdx = history.findIndex((m) => m._id === args.assistantMessageId);
    if (targetIdx < 0) throw new Error("Message not found");
    if (history[targetIdx].role !== "assistant") {
      throw new Error("Can only regenerate assistant replies");
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

    await ctx.runMutation(internal.platform.removeMessagesFrom, {
      conversationId: args.conversationId,
      userId: args.userId,
      fromMessageId: args.assistantMessageId,
    });

    const historyAfter = await ctx.runQuery(api.messages.listByConversation, {
      conversationId: args.conversationId,
      userId: args.userId,
    });

    const refreshedUser = await ctx.runQuery(api.users.getUser, {
      email: args.userId,
    });

    const systemPrompt =
      getSystemPrompt(mode) +
      buildInterestSystemAddon(parseInterestProfile(refreshedUser?.interestProfile));

    const chatMessages = trimChatMessages([
      { role: "system" as const, content: systemPrompt },
      ...historyAfter.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ]);

    const engineResult = await completeChatWithFailover(chatMessages);
    const assistantContent = engineResult.content;
    const chargedAi = engineResult.providerId !== "local_fallback";

    if (chargedAi) {
      await ctx.runMutation(api.credits.deductForChatMode, {
        userId: args.userId,
        mode,
        reference: args.conversationId,
      });
    }

    await ctx.runMutation(internal.platform.appendMessage, {
      conversationId: args.conversationId,
      userId: args.userId,
      role: "assistant",
      content: assistantContent,
    });

    const updatedUser = await ctx.runQuery(api.users.getUser, {
      email: args.userId,
    });

    return {
      content: assistantContent,
      credits: updatedUser?.credits ?? 0,
      mode,
      chatProvider: engineResult.providerId,
      chatProviderLabel: getChatProviderLabel(engineResult.providerId),
      usedFallback: engineResult.usedFallback,
    };
  },
});
