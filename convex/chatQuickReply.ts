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
import {
  buildRoutingContextFromUser,
  completeChatWithFailover,
  getChatProviderLabel,
  trimChatMessages,
} from "./chatEngine";
import { getSystemPrompt } from "./aiModes";
import { chatSystemStyleAddon } from "./assistantIdentity";
import { personaSystemPromptAddon } from "./gigaPersonas";
import { buildChatSubscriptionGuidanceAddon } from "./chatSubscriptionGuidance";
import { buildInterestSystemAddon, parseInterestProfile } from "./userLearning";
import { prepareAnswerQualityContext, validateAnswerQuality } from "./answerQuality";
import {
  isConversationalChatQuery,
  queryNeedsLiveWeb,
} from "./researchCapabilities";
import { logChatReply } from "./chatReplyLog";

const QUICK_REPLY_TIMEOUT_MS = 45_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms
    );
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

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

    const context = await ctx.runQuery(internal.platform.loadReplyContextByConversation, {
      conversationId: setup.conversationId,
      historyLimit: 6,
    });
    const user = context?.user;
    const history = context?.history ?? [];

    const qualityContext = prepareAnswerQualityContext({
      mode: setup.mode,
      query: content,
      attachments: [],
      history: history.map((turn) => ({ role: turn.role, content: turn.content })),
    });

    let systemPrompt =
      getSystemPrompt(setup.mode) +
      chatSystemStyleAddon("fast") +
      buildInterestSystemAddon(parseInterestProfile(user?.interestProfile)) +
      "\n\n" +
      qualityContext.systemPromptAddon +
      "\n\n" +
      buildChatSubscriptionGuidanceAddon({
        subscriptionPlan: user?.subscriptionPlan,
        subscriptionExpiresAt: user?.subscriptionExpiresAt,
        credits: user?.credits,
        query: content,
      });

    const personaAddon = personaSystemPromptAddon(setup.personaId);
    if (personaAddon) {
      systemPrompt += `\n\n${personaAddon}`;
    }
    systemPrompt +=
      "\n\nReply naturally and briefly to this greeting or small-talk message. Do not invent current news or run web research.";

    const chatMessages = trimChatMessages([
      { role: "system" as const, content: systemPrompt },
      ...history.slice(0, -1).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content },
    ]);

    const routing = buildRoutingContextFromUser({
      subscriptionPlan: user?.subscriptionPlan ?? "free",
      subscriptionExpiresAt: user?.subscriptionExpiresAt,
      hasPurchasedCredits: user?.hasPurchasedCredits,
      mode: setup.mode,
      query: content,
      chatSystem: "fast",
    });

    const started = Date.now();
    let engineResult;
    try {
      engineResult = await withTimeout(
        completeChatWithFailover(chatMessages, routing),
        QUICK_REPLY_TIMEOUT_MS,
        "conversationalReply"
      );
    } catch (err) {
      logChatReply("quick_reply_failed", {
        conversationId: setup.conversationId,
        userId: email,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - started,
      });
      throw err;
    }

    const validated = validateAnswerQuality({
      answer: engineResult.content,
      context: qualityContext,
    });

    await ctx.runMutation(internal.platform.appendAssistantReplyIfMissing, {
      conversationId: setup.conversationId,
      userId: email,
      content: validated.content,
      since: setup.since,
    });

    await ctx.runMutation(internal.platformStatsRecorder.recordAiRequestInternal, {
      latencyMs: Date.now() - started,
      failed: engineResult.usedFallback,
    });

    logChatReply("quick_reply_done", {
      conversationId: setup.conversationId,
      userId: email,
      providerId: engineResult.providerId,
      durationMs: Date.now() - started,
    });

    return {
      status: "complete" as const,
      conversationId: setup.conversationId,
      content: validated.content,
      chatProviderLabel: getChatProviderLabel(engineResult.providerId),
      usedFallback: engineResult.usedFallback,
      segmented: false,
    };
  },
});
