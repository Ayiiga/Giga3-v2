"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  buildRoutingContextFromUser,
  completeChatWithFailover,
  getChatProviderLabel,
  trimChatMessages,
  type ChatCompletionAttachment,
} from "./chatEngine";
import { getSystemPrompt, isValidMode, type AiModeId } from "./aiModes";
import { buildInterestSystemAddon, parseInterestProfile } from "./userLearning";
import {
  prepareAnswerQualityContext,
  recordQualityObservation,
  toRetrievalSystemMessage,
  validateAnswerQuality,
} from "./answerQuality";
import { buildMultimodalPrompt } from "./multimodalPrompt";
import type { ActionCtx } from "./_generated/server";
import type { ChatEngineResult, ChatRoutingContext } from "./chatEngine";
import { buildChatRoutePlan, buildPromptCacheKey, shouldUseResponseCache } from "./providerRouter";
import { openaiGenerateImage } from "./openaiImageClient";

function hasHallucinationRisk(flags: string[]): boolean {
  return flags.some((flag) =>
    [
      "missing_citations",
      "unsupported_claims",
      "fabricated_citations",
      "high_stakes_unverified",
      "ocr_not_verified",
      "image_analysis_unavailable",
      "attachment_analysis_unavailable",
    ].includes(flag)
  );
}

async function resolveRoutingContext(
  ctx: ActionCtx,
  email: string,
  user: {
    subscriptionPlan?: string;
    subscriptionExpiresAt?: number | null;
  },
  mode: AiModeId,
  query: string
): Promise<ChatRoutingContext> {
  const hasPurchasedCredits = await ctx.runQuery(
    internal.credits.userHasPurchasedCreditsInternal,
    { userId: email }
  );
  return buildRoutingContextFromUser({
    subscriptionPlan: user.subscriptionPlan ?? "free",
    subscriptionExpiresAt: user.subscriptionExpiresAt,
    hasPurchasedCredits,
    mode,
    query,
  });
}

async function recordAiUsage(
  ctx: ActionCtx,
  args: {
    email: string;
    mode: AiModeId;
    routing: ChatRoutingContext;
    engineResult: ChatEngineResult;
    requestKind: "text_chat" | "image_generation";
    cached: boolean;
    conversationId: string;
  }
) {
  await ctx.runMutation(internal.aiUsageAnalytics.recordAiUsageInternal, {
    userId: args.email,
    providerId: args.engineResult.providerId,
    requestKind: args.requestKind,
    mode: args.mode,
    tier: args.routing.tier,
    latencyMs: args.engineResult.latencyMs ?? 0,
    usedFallback: args.engineResult.usedFallback,
    cached: args.cached,
    usedWebSearch: args.engineResult.usedWebSearch ?? false,
    conversationId: args.conversationId,
  });
}

async function runHybridAiEngine(
  ctx: ActionCtx,
  args: {
    email: string;
    mode: AiModeId;
    query: string;
    systemPrompt: string;
    chatMessages: ReturnType<typeof trimChatMessages>;
    routing: ChatRoutingContext;
    hasAttachments: boolean;
    hasImageAttachment?: boolean;
    conversationId: string;
  }
): Promise<ChatEngineResult & { cached: boolean }> {
  const routePlan = buildChatRoutePlan({
    tier: args.routing.tier,
    mode: args.mode,
    query: args.query,
    hasAttachments: args.hasAttachments,
    hasImageAttachment: args.hasImageAttachment,
  });

  await ctx.runMutation(internal.aiRateLimit.consumeAiRateLimitInternal, {
    userId: args.email,
    tier: args.routing.tier,
  });

  if (routePlan.requestKind === "image_generation") {
    const started = Date.now();
    const image = await openaiGenerateImage(args.query);
    const content = `Here is your generated image:\n\n${image.dataUrl}`;
    const result: ChatEngineResult & { cached: boolean } = {
      content,
      providerId: "openai_image",
      usedFallback: false,
      latencyMs: Date.now() - started,
      cached: false,
    };
    await recordAiUsage(ctx, {
      email: args.email,
      mode: args.mode,
      routing: args.routing,
      engineResult: result,
      requestKind: "image_generation",
      cached: false,
      conversationId: args.conversationId,
    });
    return result;
  }

  const cacheEligible = shouldUseResponseCache({
    hasAttachments: args.hasAttachments,
    queryLength: args.query.length,
  });
  const promptHash = buildPromptCacheKey({
    mode: args.mode,
    tier: args.routing.tier,
    systemPrompt: args.systemPrompt,
    query: args.query,
  });

  if (cacheEligible) {
    const cached = await ctx.runQuery(internal.aiResponseCache.readCachedResponseInternal, {
      promptHash,
    });
    if (cached) {
      const result: ChatEngineResult & { cached: boolean } = {
        content: cached.content,
        providerId: cached.providerId,
        usedFallback: false,
        latencyMs: 0,
        cached: true,
      };
      await recordAiUsage(ctx, {
        email: args.email,
        mode: args.mode,
        routing: args.routing,
        engineResult: result,
        requestKind: "text_chat",
        cached: true,
        conversationId: args.conversationId,
      });
      return result;
    }
  }

  const engineResult = await completeChatWithFailover(args.chatMessages, args.routing);

  if (cacheEligible && engineResult.providerId !== "local_fallback") {
    await ctx.runMutation(internal.aiResponseCache.writeCachedResponseInternal, {
      promptHash,
      content: engineResult.content,
      providerId: engineResult.providerId,
    });
  }

  await recordAiUsage(ctx, {
    email: args.email,
    mode: args.mode,
    routing: args.routing,
    engineResult,
    requestKind: "text_chat",
    cached: false,
    conversationId: args.conversationId,
  });

  return { ...engineResult, cached: false };
}

const FALLBACK_REPLY =
  "I'm Giga3 AI — I'm having trouble reaching our AI services on this connection. Your message was saved — please tap send again. On slower mobile networks, replies usually arrive within a minute when the connection is stable.";

/** Background worker — generates the assistant reply after the client gets a fast ack. */
export const processJob = internalAction({
  args: { jobId: v.id("chatReplyJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(internal.chatReplyJobs.getJob, {
      jobId: args.jobId,
    });
    if (!job || job.status === "done") return;

    await ctx.runMutation(internal.chatReplyJobs.markJobStatus, {
      jobId: args.jobId,
      status: "processing",
    });

    const email = job.userId;
    const mode = (isValidMode(job.mode) ? job.mode : "general") as AiModeId;
    const attachments = job.attachmentsJson
      ? (JSON.parse(job.attachmentsJson) as ChatCompletionAttachment[])
      : [];

    try {
      const conv = await ctx.runQuery(internal.platform.getConversationInternal, {
        conversationId: job.conversationId,
      });
      if (!conv) {
        throw new Error("Conversation not found");
      }

      const history = await ctx.runQuery(
        internal.platform.listConversationMessagesInternal,
        { conversationId: job.conversationId }
      );

      const refreshedUser = await ctx.runQuery(internal.users.getUserByEmailInternal, {
        email,
      });

      const qualityContext = prepareAnswerQualityContext({
        mode,
        query: job.content,
        attachments,
        history: history.map((turn) => ({
          role: turn.role,
          content: turn.content,
        })),
      });

      const systemPrompt =
        getSystemPrompt(mode) +
        buildInterestSystemAddon(parseInterestProfile(refreshedUser?.interestProfile)) +
        "\n\n" +
        qualityContext.systemPromptAddon;

      const chatMessages = trimChatMessages([
        { role: "system" as const, content: systemPrompt },
        ...toRetrievalSystemMessage(qualityContext),
        ...history.slice(0, -1).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        {
          role: "user" as const,
          content: attachments.length
            ? buildMultimodalPrompt(job.content, attachments)
            : job.content,
          ...(attachments.length ? { attachments } : {}),
        },
      ]);

      const routing = await resolveRoutingContext(
        ctx,
        email,
        refreshedUser ?? { subscriptionPlan: "free" },
        mode,
        job.content
      );

      const engineResult = await runHybridAiEngine(ctx, {
        email,
        mode,
        query: job.content,
        systemPrompt,
        chatMessages,
        routing,
        hasAttachments: attachments.length > 0,
        hasImageAttachment: attachments.some((a) => a.kind === "image"),
        conversationId: job.conversationId,
      });

      const validated = validateAnswerQuality({
        answer: engineResult.content,
        context: qualityContext,
      });
      const assistantContent = validated.content;
      recordQualityObservation(validated.report);
      await ctx.runMutation(internal.qualityDashboard.recordResponseMetric, {
        responseMode: validated.report.responseMode,
        confidenceLabel: validated.report.confidenceLabel,
        citationCount: validated.report.citationCount,
        verificationVisible: validated.report.verificationVisible,
        verificationPassed: !hasHallucinationRisk(validated.report.flags),
        hasHallucinationRisk: hasHallucinationRisk(validated.report.flags),
      });

      const chargedAi = engineResult.providerId !== "local_fallback";
      if (chargedAi) {
        if (engineResult.providerId === "openai_image") {
          await ctx.runMutation(internal.credits.deductCreditsInternal, {
            userId: email,
            action: "image",
            reference: job.conversationId,
          });
        } else {
          await ctx.runMutation(internal.credits.deductForChatModeInternal, {
            userId: email,
            mode,
            reference: job.conversationId,
          });
        }
      }

      await ctx.runMutation(internal.platform.appendMessage, {
        conversationId: job.conversationId,
        userId: email,
        role: "assistant",
        content: assistantContent,
      });

      const title =
        conv.title === "New chat" || conv.title.endsWith("…")
          ? job.content.slice(0, 48).trim() + (job.content.length > 48 ? "…" : "")
          : conv.title;

      if (title !== conv.title) {
        await ctx.runMutation(internal.platform.updateConversationTitleInternal, {
          conversationId: job.conversationId,
          title,
        });
      }

      await ctx.runMutation(internal.chatReplyJobs.markJobStatus, {
        jobId: args.jobId,
        status: "done",
      });
    } catch (err) {
      console.error("[chatReplyWorker] failed:", err);
      await ctx.runMutation(internal.platform.appendMessage, {
        conversationId: job.conversationId,
        userId: email,
        role: "assistant",
        content: FALLBACK_REPLY,
      });
      await ctx.runMutation(internal.chatReplyJobs.markJobStatus, {
        jobId: args.jobId,
        status: "failed",
      });
    } finally {
      await ctx.runMutation(internal.chatReplyJobs.deleteJob, {
        jobId: args.jobId,
      });
    }
  },
});
