"use node";

/**
 * Shared synchronous conversational reply — greetings and small talk.
 * Used by the public quick-reply action and the fast acceptMessage path.
 */

import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  buildRoutingContextFromUser,
  completeChatWithFailover,
  getChatProviderLabel,
  trimChatMessages,
  type ChatEngineResult,
} from "./chatEngine";
import { getSystemPrompt } from "./aiModes";
import { chatSystemStyleAddon } from "./assistantIdentity";
import { personaSystemPromptAddon } from "./gigaPersonas";
import { buildChatSubscriptionGuidanceAddon } from "./chatSubscriptionGuidance";
import { buildInterestSystemAddon, parseInterestProfile } from "./userLearning";
import { prepareAnswerQualityContext, validateAnswerQuality } from "./answerQuality";
import { CHAT_ERROR_CODES, classifyProviderError } from "./chatErrorCodes";
import { chatUserFacingMessage } from "./chatUserMessages";
import { logChatReply } from "./chatReplyLog";

export const CONVERSATIONAL_REPLY_TIMEOUT_MS = 45_000;

const ENGINE_FALLBACK_SNIPPET =
  "having trouble reaching our AI services on this connection";

export function isEngineFallbackReply(content: string): boolean {
  return content.toLowerCase().includes(ENGINE_FALLBACK_SNIPPET);
}

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

export type ConversationalReplyArgs = {
  requestId?: string;
  jobId?: Id<"chatReplyJobs">;
  conversationId: Id<"conversations">;
  userId: string;
  content: string;
  mode: string;
  personaId?: string;
  since: number;
};

export type ConversationalReplyResult = {
  content: string;
  chatProviderLabel: string;
  usedFallback: boolean;
  providerId: string;
  durationMs: number;
  errorCode?: string;
};

export async function executeConversationalReply(
  ctx: ActionCtx,
  args: ConversationalReplyArgs
): Promise<ConversationalReplyResult> {
  const started = Date.now();
  const requestId = args.requestId ?? args.jobId ?? args.conversationId;

  const context = await ctx.runQuery(internal.platform.loadReplyContextByConversation, {
    conversationId: args.conversationId,
    historyLimit: 6,
  });
  const user = context?.user;
  const history = context?.history ?? [];

  const qualityContext = prepareAnswerQualityContext({
    mode: args.mode,
    query: args.content,
    attachments: [],
    history: history.map((turn) => ({ role: turn.role, content: turn.content })),
  });

  let systemPrompt =
    getSystemPrompt(args.mode) +
    chatSystemStyleAddon("fast") +
    buildInterestSystemAddon(parseInterestProfile(user?.interestProfile)) +
    "\n\n" +
    qualityContext.systemPromptAddon +
    "\n\n" +
    buildChatSubscriptionGuidanceAddon({
      subscriptionPlan: user?.subscriptionPlan,
      subscriptionExpiresAt: user?.subscriptionExpiresAt,
      credits: user?.credits,
      query: args.content,
    });

  const personaAddon = personaSystemPromptAddon(args.personaId);
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
    { role: "user" as const, content: args.content },
  ]);

  const routing = buildRoutingContextFromUser({
    subscriptionPlan: user?.subscriptionPlan ?? "free",
    subscriptionExpiresAt: user?.subscriptionExpiresAt,
    hasPurchasedCredits: user?.hasPurchasedCredits,
    mode: args.mode,
    query: args.content,
    chatSystem: "fast",
  });

  logChatReply("conversational_start", {
    requestId,
    conversationId: args.conversationId,
    userId: args.userId,
    jobId: args.jobId ?? null,
  });

  let engineResult: ChatEngineResult;
  let errorCode: string | undefined;
  try {
    engineResult = await withTimeout(
      completeChatWithFailover(chatMessages, routing),
      CONVERSATIONAL_REPLY_TIMEOUT_MS,
      "conversationalReply"
    );
    if (engineResult.usedFallback || engineResult.providerId === "local_fallback") {
      errorCode = CHAT_ERROR_CODES.ALL_PROVIDERS_FAILED;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errorCode = classifyProviderError(message);
    logChatReply("conversational_provider_failed", {
      requestId,
      conversationId: args.conversationId,
      userId: args.userId,
      errorCode,
      error: message,
      durationMs: Date.now() - started,
    });
    engineResult = {
      content: chatUserFacingMessage(CHAT_ERROR_CODES.ALL_PROVIDERS_FAILED),
      providerId: "local_fallback",
      usedFallback: true,
      latencyMs: Date.now() - started,
    };
  }

  const validated = validateAnswerQuality({
    answer: engineResult.content,
    context: qualityContext,
  });

  await ctx.runMutation(internal.platform.appendAssistantReplyIfMissing, {
    conversationId: args.conversationId,
    userId: args.userId,
    content: validated.content,
    since: args.since,
  });

  await ctx.runMutation(internal.platformStatsRecorder.recordAiRequestInternal, {
    latencyMs: Date.now() - started,
    failed: engineResult.usedFallback,
  });

  logChatReply("conversational_done", {
    requestId,
    conversationId: args.conversationId,
    userId: args.userId,
    providerId: engineResult.providerId,
    errorCode: errorCode ?? null,
    durationMs: Date.now() - started,
    fallbackUsed: engineResult.usedFallback,
  });

  return {
    content: validated.content,
    chatProviderLabel: getChatProviderLabel(engineResult.providerId),
    usedFallback: engineResult.usedFallback,
    providerId: engineResult.providerId,
    durationMs: Date.now() - started,
    errorCode,
  };
}
