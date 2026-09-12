"use node";

/**
 * Synchronous conversational replies — AI chat first, no job queue.
 * Greetings and small talk return in one HTTP round trip so 3G clients
 * are not stuck polling a background worker that recovery may finalize early.
 */

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { getChatProviderLabel } from "./chatEngine";
import { executeConversationalReply } from "./chatConversationalCore";
import {
  isConversationalChatQuery,
  queryNeedsLiveWeb,
} from "./researchCapabilities";
import { logChatReply } from "./chatReplyLog";

export const conversational = action({
  args: {
    sessionToken: v.string(),
    conversationId: v.optional(v.id("conversations")),
    content: v.string(),
    mode: v.optional(v.string()),
    personaId: v.optional(v.string()),
    clientRequestId: v.optional(v.string()),
    chatSystem: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const content = args.content.trim();
    if (!content) {
      throw new Error("Message cannot be empty.");
    }
    if (!isConversationalChatQuery(content)) {
      throw new Error("Quick reply is only for conversational messages.");
    }
    if (queryNeedsLiveWeb({ query: content, capability: "general", mode: args.mode })) {
      throw new Error("Quick reply is not used when live web is required.");
    }

    const setup = await ctx.runMutation(
      internal.chatQuickReplyMutations.insertConversationalTurn,
      {
        email,
        conversationId: args.conversationId,
        content,
        mode: args.mode,
        personaId: args.personaId,
        clientRequestId: args.clientRequestId,
      }
    );

    if ("content" in setup && setup.deduped && setup.content) {
      return {
        status: "complete" as const,
        conversationId: setup.conversationId,
        content: setup.content,
        chatProviderLabel: getChatProviderLabel("gemini"),
        usedFallback: false,
        segmented: false,
      };
    }

    const result = await executeConversationalReply(ctx, {
      requestId: args.clientRequestId,
      conversationId: setup.conversationId,
      userId: email,
      content,
      mode: setup.mode,
      personaId: setup.personaId,
      since: setup.since,
    });

    return {
      status: "complete" as const,
      conversationId: setup.conversationId,
      content: result.content,
      chatProviderLabel: result.chatProviderLabel,
      usedFallback: result.usedFallback,
      segmented: false,
    };
  },
});
