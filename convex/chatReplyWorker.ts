"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { buildRoutingContextFromUser,
  completeChatWithFailover,
  getChatProviderLabel,
  trimChatMessages,
  type ChatCompletionAttachment,
} from "./chatEngine";
import { getSystemPrompt, isValidMode, type AiModeId } from "./aiModes";
import { chatSystemStyleAddon } from "./assistantIdentity";
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
import {
  buildChatRoutePlan,
  buildPromptCacheKey,
  enhanceImageGenerationPrompt,
  imageAssetOrientation,
  shouldEnableWebSearch,
  shouldUseResponseCache,
  type RequestKind,
} from "./providerRouter";
import { generateFreeImageForChat } from "./mediaEngine";
import { openaiGenerateImage } from "./openaiImageClient";
import { persistImageUrlIfNeeded } from "./mediaStorage";
import type { FalImageSize } from "./falClient";
import { logChatReply } from "./chatReplyLog";
import { isLiveNewsEnabled } from "./featureFlags";
import {
  IMAGE_UPGRADE_MARKDOWN,
  resolveImageGenerationDecision,
} from "./premiumImage";

// Kept below the client reply-wait deadline (CHAT_REPLY_WAIT_MS = 150s) so the
// worker persists a real or fallback reply — clearing "Thinking…" gracefully via
// the live query — before the client's own failsafe error fires.
const WORKER_TEXT_TIMEOUT_MS =
  Number(process.env.CHAT_WORKER_TIMEOUT_MS) || 120_000;
const WORKER_IMAGE_TIMEOUT_MS =
  Number(process.env.CHAT_WORKER_IMAGE_TIMEOUT_MS) || 150_000;

function withWorkerTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
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
  query: string,
  chatSystem?: string
): Promise<ChatRoutingContext> {
  const hasPurchasedCredits = await ctx.runQuery(
    internal.credits.userHasPurchasedCreditsInternal,
    { userId: email }
  );
  const base = buildRoutingContextFromUser({
    subscriptionPlan: user.subscriptionPlan ?? "free",
    subscriptionExpiresAt: user.subscriptionExpiresAt,
    hasPurchasedCredits,
    mode,
    query,
    chatSystem,
  });

  if (base.tier === "premium" || chatSystem !== "pro") {
    return base;
  }

  const snapshot = await ctx.runQuery(internal.freeOpenAiQuota.getSnapshotInternal, {
    userId: email,
  });
  if (snapshot.remaining > 0) {
    return {
      ...base,
      tier: "premium",
      usingFreeOpenAiQuota: true,
    };
  }

  return base;
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
    subscriptionPlan: string;
    subscriptionExpiresAt?: number | null;
  }
): Promise<ChatEngineResult & { cached: boolean; requestKind: RequestKind }> {
  const routePlan = buildChatRoutePlan({
    tier: args.routing.tier,
    mode: args.mode,
    query: args.query,
    hasAttachments: args.hasAttachments,
    hasImageAttachment: args.hasImageAttachment,
    chatSystem: args.routing.chatSystem,
  });

  if (
    args.routing.tier === "free" &&
    args.routing.chatSystem === "pro" &&
    routePlan.requestKind === "text_chat"
  ) {
    const exhausted: ChatEngineResult & { cached: boolean; requestKind: RequestKind } = {
      content:
        `You've used all ${process.env.FREE_OPENAI_DAILY_LIMIT ?? "5"} free OpenAI messages for today. ` +
        "Subscribe or buy credits for unlimited Giga3 Pro, or switch to Fast / Smart / Creator free models.",
      providerId: "local_fallback",
      usedFallback: true,
      latencyMs: 0,
      cached: false,
      requestKind: "text_chat",
    };
    return exhausted;
  }

  if (args.routing.usingFreeOpenAiQuota) {
    const consumed = await ctx.runMutation(internal.freeOpenAiQuota.tryConsumeInternal, {
      userId: args.email,
    });
    if (!consumed.ok) {
      const exhausted: ChatEngineResult & { cached: boolean; requestKind: RequestKind } = {
        content:
          `You've used all ${consumed.snapshot.limit} free OpenAI messages for today. ` +
          "Subscribe or buy credits for unlimited Giga3 Pro, or switch to another model.",
        providerId: "local_fallback",
        usedFallback: true,
        latencyMs: 0,
        cached: false,
        requestKind: "text_chat",
      };
      return exhausted;
    }
    logChatReply("free_openai_quota_used", {
      conversationId: args.conversationId,
      userId: args.email,
      remaining: consumed.snapshot.remaining,
    });
  }

  await ctx.runMutation(internal.aiRateLimit.consumeAiRateLimitInternal, {
    userId: args.email,
    tier: args.routing.tier,
  });

  if (routePlan.requestKind === "image_generation") {
    const started = Date.now();
    const orientation = imageAssetOrientation(args.query);
    const imageSize: FalImageSize =
      orientation === "portrait"
        ? "portrait_4_3"
        : orientation === "landscape"
          ? "landscape_4_3"
          : "square_hd";
    const imagePrompt = enhanceImageGenerationPrompt(args.query);

    const imageDecision = resolveImageGenerationDecision(
      args.subscriptionPlan,
      args.subscriptionExpiresAt
    );

    if (imageDecision.action === "upgrade") {
      const result: ChatEngineResult & { cached: boolean; requestKind: RequestKind } = {
        content: IMAGE_UPGRADE_MARKDOWN,
        providerId: "policy",
        usedFallback: false,
        latencyMs: Date.now() - started,
        cached: false,
        requestKind: "image_generation",
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

    let rawUrl: string;
    let providerId: string;
    let usedFallback = false;

    if (imageDecision.action === "openai") {
      try {
        const image = await openaiGenerateImage(imagePrompt, { imageSize });
        rawUrl = image.dataUrl;
        providerId = "openai_image";
      } catch (err) {
        // Never fail a premium visual request outright — fall back to the
        // free multi-provider image pipeline (fal → Replicate → Google).
        logChatReply("image_openai_failed", {
          conversationId: args.conversationId,
          userId: args.email,
          error: err instanceof Error ? err.message : String(err),
        });
        const fallback = await generateFreeImageForChat(imagePrompt);
        rawUrl = fallback.imageUrl;
        providerId = fallback.provider;
        usedFallback = true;
      }
    } else {
      const image = await generateFreeImageForChat(imagePrompt);
      rawUrl = image.imageUrl;
      providerId = image.provider;
    }

    // Persist base64 data URLs (gpt-image-1, Gemini) to Convex file storage so
    // the assistant message stays small — a raw data URL exceeds Convex's value
    // size limit and would fail the insert, leaving chat stuck on a fallback.
    const imageUrl = await persistImageUrlIfNeeded(ctx, rawUrl);
    const content = `Here is your generated image:\n\n${imageUrl}`;
    const result: ChatEngineResult & { cached: boolean; requestKind: RequestKind } = {
      content,
      providerId,
      usedFallback,
      latencyMs: Date.now() - started,
      cached: false,
      requestKind: "image_generation",
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
      const result: ChatEngineResult & { cached: boolean; requestKind: RequestKind } = {
        content: cached.content,
        providerId: cached.providerId,
        usedFallback: false,
        latencyMs: 0,
        cached: true,
        requestKind: "text_chat",
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

  const engineResult = await withWorkerTimeout(
    completeChatWithFailover(args.chatMessages, args.routing),
    args.hasAttachments || args.hasImageAttachment
      ? WORKER_IMAGE_TIMEOUT_MS
      : WORKER_TEXT_TIMEOUT_MS,
    "completeChatWithFailover"
  );

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

  return { ...engineResult, cached: false, requestKind: "text_chat" };
}

const FALLBACK_REPLY =
  "I'm Giga3 AI — I'm having trouble reaching our AI services on this connection. Your message was saved — please tap send again. On slower mobile networks, replies usually arrive within a minute when the connection is stable.";

/** Clear, honest reply when the user hit the AI rate limit (not a service outage). */
function rateLimitReply(message: string): string {
  return `${message}\n\nYour message was saved. You can also upgrade on the Subscription page or buy credits for higher limits.`;
}

function isRateLimitError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.name === "RateLimitError" || /rate limit/i.test(err.message);
}

/** Background worker — generates the assistant reply after the client gets a fast ack. */
export const processJob = internalAction({
  args: { jobId: v.id("chatReplyJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(internal.chatReplyJobs.getJob, {
      jobId: args.jobId,
    });

    if (!job) return;

    if (job.cancelled || job.status === "cancelled") {
      await ctx.runMutation(internal.chatReplyJobs.deleteJob, {
        jobId: args.jobId,
      });
      return;
    }

    if (job.status === "done") {
      await ctx.runMutation(internal.chatReplyJobs.deleteJob, {
        jobId: args.jobId,
      });
      return;
    }

    const workerStarted = Date.now();
    logChatReply("worker_start", {
      jobId: args.jobId,
      conversationId: job.conversationId,
      userId: job.userId,
      kind: job.kind ?? "reply",
      chatSystem: job.chatSystem ?? null,
      mode: job.mode,
    });

    await ctx.runMutation(internal.chatReplyJobs.markJobStatus, {
      jobId: args.jobId,
      status: "processing",
    });

    const email = job.userId;
    const mode = (isValidMode(job.mode) ? job.mode : "general") as AiModeId;
    const attachments = job.attachmentsJson
      ? (JSON.parse(job.attachmentsJson) as ChatCompletionAttachment[])
      : [];

    const isCancelled = async () => {
      const fresh = await ctx.runQuery(internal.chatReplyJobs.getJob, {
        jobId: args.jobId,
      });
      return !fresh || fresh.cancelled || fresh.status === "cancelled";
    };

    try {
      if (await isCancelled()) {
        await ctx.runMutation(internal.chatReplyJobs.markJobStatus, {
          jobId: args.jobId,
          status: "cancelled",
        });
        return;
      }

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

      const segmentRecap = await ctx.runQuery(
        internal.platform.listSegmentRecapInternal,
        { conversationId: job.conversationId }
      );

      const last = history[history.length - 1];
      if (
        last?.role === "assistant" &&
        last.createdAt >= job.createdAt &&
        job.kind !== "regenerate"
      ) {
        await ctx.runMutation(internal.chatReplyJobs.markJobStatus, {
          jobId: args.jobId,
          status: "done",
        });
        return;
      }

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

      const systemPromptBase =
        getSystemPrompt(mode) +
        chatSystemStyleAddon(job.chatSystem) +
        buildInterestSystemAddon(parseInterestProfile(refreshedUser?.interestProfile)) +
        "\n\n" +
        qualityContext.systemPromptAddon;

      let systemPrompt = systemPromptBase;
      if (segmentRecap) {
        systemPrompt += `\n\n${segmentRecap}`;
      }
      if (
        isLiveNewsEnabled() &&
        shouldEnableWebSearch(
          job.content,
          mode,
          attachments.some((a) => a.kind === "image")
        )
      ) {
        const briefing = await ctx.runQuery(internal.liveNewsInternal.getBriefingInternal, {});
        if (briefing) {
          systemPrompt += `\n\n${briefing}`;
        }
      }

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
        job.content,
        job.chatSystem
      );

      logChatReply("worker_routing", {
        jobId: args.jobId,
        conversationId: job.conversationId,
        userId: email,
        tier: routing.tier,
        chatSystem: routing.chatSystem ?? null,
        providerPlan: routing.tier === "premium" ? "openai_first" : "gemini_first",
      });

      const started = Date.now();
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
        subscriptionPlan: refreshedUser?.subscriptionPlan ?? "free",
        subscriptionExpiresAt: refreshedUser?.subscriptionExpiresAt,
      });
      const latencyMs = engineResult.latencyMs ?? Date.now() - started;

      logChatReply("worker_provider_done", {
        jobId: args.jobId,
        conversationId: job.conversationId,
        userId: email,
        providerId: engineResult.providerId,
        tier: routing.tier,
        latencyMs,
        cached: engineResult.cached,
        usedFallback: engineResult.usedFallback,
      });

      if (await isCancelled()) {
        await ctx.runMutation(internal.chatReplyJobs.markJobStatus, {
          jobId: args.jobId,
          status: "cancelled",
        });
        return;
      }

      // Image generations already returned the finished asset URL — skip the
      // answer-quality/auto-visual augmentation (it would append a broken
      // Mermaid block wrapping the image URL and redundant visual specs).
      let assistantContent: string;
      if (engineResult.requestKind === "image_generation") {
        assistantContent = engineResult.content;
      } else {
        const validated = validateAnswerQuality({
          answer: engineResult.content,
          context: qualityContext,
        });
        assistantContent = validated.content;
        recordQualityObservation(validated.report);
        await ctx.runMutation(internal.qualityDashboard.recordResponseMetric, {
          responseMode: validated.report.responseMode,
          confidenceLabel: validated.report.confidenceLabel,
          citationCount: validated.report.citationCount,
          verificationVisible: validated.report.verificationVisible,
          verificationPassed: !hasHallucinationRisk(validated.report.flags),
          hasHallucinationRisk: hasHallucinationRisk(validated.report.flags),
        });
      }

      const chargedAi = engineResult.providerId !== "local_fallback";

      const replyExists = await ctx.runQuery(
        internal.chatReplyJobs.hasAssistantReplySince,
        { conversationId: job.conversationId, since: job.createdAt }
      );
      if (replyExists) {
        logChatReply("worker_skip_duplicate_reply", {
          jobId: args.jobId,
          conversationId: job.conversationId,
          userId: email,
        });
      } else {
        await ctx.runMutation(internal.platform.appendMessage, {
          conversationId: job.conversationId,
          userId: email,
          role: "assistant",
          content: assistantContent,
        });
      }

      if (chargedAi) {
        try {
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
        } catch (deductErr) {
          logChatReply("worker_credit_deduct_failed", {
            jobId: args.jobId,
            conversationId: job.conversationId,
            userId: email,
            error:
              deductErr instanceof Error ? deductErr.message : String(deductErr),
          });
        }
      }

      await ctx.runMutation(internal.platformStatsRecorder.recordAiRequestInternal, {
        latencyMs,
        failed: false,
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

      logChatReply("worker_done", {
        jobId: args.jobId,
        conversationId: job.conversationId,
        userId: email,
        durationMs: Date.now() - workerStarted,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logChatReply("worker_failed", {
        jobId: args.jobId,
        conversationId: job.conversationId,
        userId: email,
        error: message,
        durationMs: Date.now() - workerStarted,
      });
      console.error("[chatReplyWorker] failed:", err);
      if (!(await isCancelled())) {
        const replyExists = await ctx.runQuery(
          internal.chatReplyJobs.hasAssistantReplySince,
          { conversationId: job.conversationId, since: job.createdAt }
        );
        if (!replyExists) {
          await ctx.runMutation(internal.platform.appendMessage, {
            conversationId: job.conversationId,
            userId: email,
            role: "assistant",
            content: isRateLimitError(err) ? rateLimitReply(message) : FALLBACK_REPLY,
          });
        }
        await ctx.runMutation(internal.chatReplyJobs.markJobStatus, {
          jobId: args.jobId,
          status: "failed",
        });
        await ctx.runMutation(internal.platformStatsRecorder.recordAiRequestInternal, {
          failed: true,
        });
      }
    } finally {
      await ctx.runMutation(internal.chatReplyJobs.deleteJob, {
        jobId: args.jobId,
      });
    }
  },
});
