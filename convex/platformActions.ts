"use node";

import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import {
  assessImageProcessingCapability,
  buildRoutingContextFromUser,
  completeChatWithFailover,
  getChatProviderLabel,
  trimChatMessages,
  type ChatCompletionAttachment,
  type ChatEngineResult,
  type ChatRoutingContext,
} from "./chatEngine";
import { getSystemPrompt, isValidMode, type AiModeId } from "./aiModes";
import { buildChatSubscriptionGuidanceAddon } from "./chatSubscriptionGuidance";
import { buildInterestSystemAddon, parseInterestProfile } from "./userLearning";
import {
  prepareAnswerQualityContext,
  recordQualityObservation,
  toRetrievalSystemMessage,
  validateAnswerQuality,
} from "./answerQuality";
import { requireSessionWithMonitoring } from "./auth";
import { logSecurityEvent } from "./securityHelpers";
import { SECURITY_EVENT_TYPES } from "./securityMonitoring";
import {
  toUploadRecordFiles,
  validateAttachments,
  type RawAttachmentInput,
} from "./attachmentValidation";
import {
  buildChatRoutePlan,
  buildPromptCacheKey,
  enhanceImageGenerationPrompt,
  imageAssetOrientation,
  shouldEnableWebSearch,
  shouldUseResponseCache,
} from "./providerRouter";
import { generateImageWithFallback } from "./mediaEngine";
import { isChatImageUploadForMessage, missingChatImageReferenceMessage, resolveChatImagePrompt, resolveChatImageSourceUrl } from "./chatImageSource";
import { CREDIT_COSTS } from "./creditsConfig";
import type { ActionCtx } from "./_generated/server";
import type { FalImageSize } from "./falClient";
import { persistImageUrlIfNeeded } from "./mediaStorage";
import { isLiveNewsEnabled } from "./featureFlags";


function latestUserPrompt(
  history: Array<{ role: string; content: string }>,
  fallback: string
): string {
  const match = [...history].reverse().find((turn) => turn.role === "user");
  return match?.content ?? fallback;
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

function imageCapabilityFailureMessage(
  status: "analysis_unavailable" | "upload_failed" | "unsupported_format",
  supportedFormats: string[]
): string {
  if (status === "analysis_unavailable") {
    return "Image analysis is currently unavailable. Please try again later or contact support.";
  }
  if (status === "upload_failed") {
    return "The image upload did not complete successfully. Please upload the image again.";
  }
  return `This image format is not currently supported. Supported formats include ${supportedFormats.join(", ")}.`;
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
    sourceImageUrl?: string;
    conversationId: string;
    subscriptionPlan: string;
    subscriptionExpiresAt?: number | null;
  }
): Promise<ChatEngineResult & { cached: boolean; requestKind?: "text_chat" | "image_generation" }> {
  const routePlan = buildChatRoutePlan({
    tier: args.routing.tier,
    mode: args.mode,
    query: args.query,
    hasAttachments: args.hasAttachments,
    hasImageAttachment: args.hasImageAttachment,
    hasEditableImageSource: Boolean(args.sourceImageUrl),
    chatSystem: args.routing.chatSystem,
  });

  await ctx.runMutation(internal.aiRateLimit.consumeAiRateLimitInternal, {
    userId: args.email,
    tier: args.routing.tier,
  });

  if (routePlan.requestKind === "image_generation") {
    const missingReference = missingChatImageReferenceMessage(args.query, args.sourceImageUrl);
    if (missingReference) throw new Error(missingReference);
    const started = Date.now();
    const prompt = resolveChatImagePrompt(args.query, args.chatMessages.map(message => ({
      role: message.role, content: typeof message.content === "string" ? message.content : "",
    })));
    const orientation = imageAssetOrientation(prompt);
    const imageSize: FalImageSize = orientation === "portrait"
      ? "portrait_4_3" : orientation === "landscape" ? "landscape_4_3" : "square_hd";
    const image = await generateImageWithFallback({
      prompt: enhanceImageGenerationPrompt(prompt), sourceImageUrl: args.sourceImageUrl, imageSize,
    });
    const imageUrl = await persistImageUrlIfNeeded(ctx, image.imageUrl);
    const result = {
      content: `Here is your generated image:\n\n${imageUrl}`,
      providerId: image.provider === "openai" ? "openai_image" : image.provider,
      usedFallback: image.provider !== "openai",
      latencyMs: Date.now() - started, cached: false,
      requestKind: "image_generation" as const,
    };
    await recordAiUsage(ctx, {
      email: args.email, mode: args.mode, routing: args.routing, engineResult: result,
      requestKind: "image_generation", cached: false, conversationId: args.conversationId,
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

export const sendMessage = action({
  args: {
    sessionToken: v.string(),
    conversationId: v.id("conversations"),
    content: v.string(),
    mode: v.optional(v.string()),
    attachments: v.optional(
      v.array(
        v.object({
          kind: v.union(
            v.literal("image"),
            v.literal("document"),
            v.literal("archive"),
            v.literal("spreadsheet"),
            v.literal("presentation"),
            v.literal("pdf"),
            v.literal("text")
          ),
          name: v.string(),
          mimeType: v.optional(v.string()),
          sizeBytes: v.number(),
          text: v.optional(v.string()),
          dataUrl: v.optional(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const email = await requireSessionWithMonitoring(args.sessionToken, ctx);

    const conv = await ctx.runQuery(api.conversations.get, {
      conversationId: args.conversationId,
      sessionToken: args.sessionToken,
    });
    if (!conv) throw new Error("Conversation not found");

    let user = await ctx.runQuery(api.users.getUser, {
      sessionToken: args.sessionToken,
    });
    if (!user) {
      await ctx.runMutation(internal.users.ensureUserInternal, { email });
      user = await ctx.runQuery(api.users.getUser, {
        sessionToken: args.sessionToken,
      });
    }

    const mode =
      (args.mode && isValidMode(args.mode) ? args.mode : conv.mode ?? "general") as AiModeId;
    const rawAttachments = (args.attachments ?? []) as RawAttachmentInput[];
    const attachments = rawAttachments as ChatCompletionAttachment[];
    const imageCapability = assessImageProcessingCapability(attachments);

    if (attachments.length > 0) {
      const usage = await ctx.runQuery(api.uploadLimits.getUploadUsageSnapshot, {
        sessionToken: args.sessionToken,
      });
      let validated;
      try {
        validated = validateAttachments(
          rawAttachments,
          usage.limits.maxFileBytes
        );
      } catch (validationError) {
        await logSecurityEvent(ctx, {
          eventType: SECURITY_EVENT_TYPES.ATTACHMENT_REJECTED,
          severity: "low",
          message:
            validationError instanceof Error
              ? validationError.message
              : "Attachment rejected",
          email,
        });
        throw validationError;
      }
      try {
        await ctx.runMutation(internal.uploadLimits.recordUploadsInternal, {
          userId: email,
          files: toUploadRecordFiles(validated),
        });
      } catch (uploadError) {
        await logSecurityEvent(ctx, {
          eventType: SECURITY_EVENT_TYPES.UPLOAD_ABUSE,
          severity: "medium",
          message:
            uploadError instanceof Error
              ? uploadError.message
              : "Upload quota exceeded",
          email,
        });
        throw uploadError;
      }
    }

    if (mode !== conv.mode) {
      await ctx.runMutation(api.conversations.setMode, {
        conversationId: args.conversationId,
        sessionToken: args.sessionToken,
        mode,
      });
    }

    await ctx.runMutation(internal.platform.appendMessage, {
      conversationId: args.conversationId,
      userId: email,
      role: "user",
      content: args.content,
    });

    await ctx.runMutation(api.users.recordChatInteraction, {
      sessionToken: args.sessionToken,
      mode,
      messageContent: args.content,
    });

    const history = await ctx.runQuery(api.messages.listByConversation, {
      conversationId: args.conversationId,
      sessionToken: args.sessionToken,
    });

    const qualityContext = prepareAnswerQualityContext({
      mode,
      query: args.content,
      attachments,
      history: history.map((turn) => ({
        role: turn.role,
        content: turn.content,
      })),
    });

    if (
      imageCapability.status === "analysis_unavailable" ||
      imageCapability.status === "upload_failed" ||
      imageCapability.status === "unsupported_format"
    ) {
      const failureMessage = imageCapabilityFailureMessage(
        imageCapability.status,
        imageCapability.supportedFormats
      );
      const failureContext = {
        ...qualityContext,
        requiresCitation: false,
        showConfidenceByDefault: false,
        showVerificationByDefault: false,
      };
      const validatedFailure = validateAnswerQuality({
        answer: failureMessage,
        context: failureContext,
      });
      const assistantContent = validatedFailure.content;
      recordQualityObservation(validatedFailure.report);
      await ctx.runMutation(internal.qualityDashboard.recordResponseMetric, {
        responseMode: validatedFailure.report.responseMode,
        confidenceLabel: validatedFailure.report.confidenceLabel,
        citationCount: validatedFailure.report.citationCount,
        verificationVisible: validatedFailure.report.verificationVisible,
        verificationPassed: !hasHallucinationRisk(validatedFailure.report.flags),
        hasHallucinationRisk: hasHallucinationRisk(validatedFailure.report.flags),
      });

      await ctx.runMutation(internal.platform.appendMessage, {
        conversationId: args.conversationId,
        userId: email,
        role: "assistant",
        content: assistantContent,
      });

      const updatedUser = await ctx.runQuery(api.users.getUser, {
        sessionToken: args.sessionToken,
      });

      return {
        status: "complete" as const,
        content: assistantContent,
        credits: updatedUser?.credits ?? 0,
        mode,
        chatProvider: "local_fallback",
        chatProviderLabel: getChatProviderLabel("local_fallback"),
        usedFallback: true,
        quality: validatedFailure.report,
      };
    }

    const jobId = await ctx.runMutation(internal.chatReplyJobs.createJob, {
      conversationId: args.conversationId,
      userId: email,
      mode,
      content: args.content,
      attachmentsJson:
        attachments.length > 0 ? JSON.stringify(attachments) : undefined,
    });

    await ctx.scheduler.runAfter(0, internal.chatReplyWorker.processJob, {
      jobId,
    });

    const updatedUser = await ctx.runQuery(api.users.getUser, {
      sessionToken: args.sessionToken,
    });

    return {
      status: "processing" as const,
      jobId,
      credits: updatedUser?.credits ?? 0,
      mode,
      chatProviderLabel: getChatProviderLabel("gemini"),
      usedFallback: false,
    };
  },
});

export const regenerateMessage = action({
  args: {
    sessionToken: v.string(),
    conversationId: v.id("conversations"),
    assistantMessageId: v.id("messages"),
    mode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = await requireSessionWithMonitoring(args.sessionToken, ctx);

    const conv = await ctx.runQuery(api.conversations.get, {
      conversationId: args.conversationId,
      sessionToken: args.sessionToken,
    });
    if (!conv) throw new Error("Conversation not found");

    const history = await ctx.runQuery(api.messages.listByConversation, {
      conversationId: args.conversationId,
      sessionToken: args.sessionToken,
    });
    const targetIdx = history.findIndex((m) => m._id === args.assistantMessageId);
    if (targetIdx < 0) throw new Error("Message not found");
    if (history[targetIdx].role !== "assistant") {
      throw new Error("Can only regenerate assistant replies");
    }

    const mode =
      (args.mode && isValidMode(args.mode) ? args.mode : conv.mode ?? "general") as AiModeId;

    if (mode !== conv.mode) {
      await ctx.runMutation(api.conversations.setMode, {
        conversationId: args.conversationId,
        sessionToken: args.sessionToken,
        mode,
      });
    }

    const refreshedUser = await ctx.runQuery(api.users.getUser, {
      sessionToken: args.sessionToken,
    });
    const regenerationQuery = latestUserPrompt(history.slice(0, targetIdx), "");
    const regenerationUser = [...history.slice(0, targetIdx)].reverse().find(message => message.role === "user");
    const uploadBelongsToTarget = isChatImageUploadForMessage({
      storedAt: conv.lastVisionAttachmentsAt,
      messageCreatedAt: regenerationUser?.createdAt,
    });
    let sourceImageUrl: string | undefined;
    if (conv.lastVisionAttachmentsJson && Date.now() - (conv.lastVisionAttachmentsAt ?? 0) <= 45 * 60 * 1000) {
      try {
        sourceImageUrl = resolveChatImageSourceUrl({
          query: regenerationQuery,
          imageAttachmentsAreHistorical: !uploadBelongsToTarget,
          imageAttachments: JSON.parse(conv.lastVisionAttachmentsJson),
          history: history.slice(0, targetIdx),
        });
      } catch { /* Continue with available conversation images. */ }
    }
    sourceImageUrl ??= resolveChatImageSourceUrl({
      query: regenerationQuery,
      imageAttachments: [], history: history.slice(0, targetIdx),
    });
    const regenerationKind = buildChatRoutePlan({
      tier: "free", mode, query: regenerationQuery,
      hasEditableImageSource: Boolean(sourceImageUrl),
    }).requestKind;
    if (regenerationKind === "image_generation" && (refreshedUser?.credits ?? 0) < CREDIT_COSTS.image) {
      throw new Error(`Insufficient credits (${CREDIT_COSTS.image} required for an image).`);
    }
    const replySince = Date.now();

    const isImageRegeneration = regenerationKind === "image_generation";
    if (!isImageRegeneration) {
      await ctx.runMutation(internal.platform.removeMessagesFrom, {
        conversationId: args.conversationId, userId: email,
        fromMessageId: args.assistantMessageId,
      });
    }
    const historyAfter = isImageRegeneration
      ? history.slice(0, targetIdx)
      : await ctx.runQuery(api.messages.listByConversation, {
          conversationId: args.conversationId, sessionToken: args.sessionToken,
        });

    const query = latestUserPrompt(historyAfter, "");
    const qualityContext = prepareAnswerQualityContext({
      mode,
      query,
      history: historyAfter.map((turn) => ({
        role: turn.role,
        content: turn.content,
      })),
    });

    const systemPromptBase =
      getSystemPrompt(mode) +
      buildInterestSystemAddon(parseInterestProfile(refreshedUser?.interestProfile)) +
      "\n\n" +
      qualityContext.systemPromptAddon;

    let systemPrompt =
      systemPromptBase +
      "\n\n" +
      buildChatSubscriptionGuidanceAddon({
        subscriptionPlan: refreshedUser?.subscriptionPlan,
        subscriptionExpiresAt: refreshedUser?.subscriptionExpiresAt,
        credits: refreshedUser?.credits,
        query,
      });
    if (isLiveNewsEnabled() && shouldEnableWebSearch(query, mode)) {
      const briefing = await ctx.runQuery(internal.liveNewsInternal.getBriefingInternal, {});
      if (briefing) {
        systemPrompt += `\n\n${briefing}`;
      }
    }

    const chatMessages = trimChatMessages([
      { role: "system" as const, content: systemPrompt },
      ...toRetrievalSystemMessage(qualityContext),
      ...historyAfter.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ]);

    const routing = await resolveRoutingContext(
      ctx,
      email,
      refreshedUser ?? { subscriptionPlan: "free" },
      mode,
      query
    );

    const engineResult = await runHybridAiEngine(ctx, {
      email,
      mode,
      query,
      systemPrompt,
      chatMessages,
      routing,
      hasAttachments: Boolean(sourceImageUrl),
      sourceImageUrl,
      conversationId: args.conversationId,
      subscriptionPlan: refreshedUser?.subscriptionPlan ?? "free",
      subscriptionExpiresAt: refreshedUser?.subscriptionExpiresAt,
    });
    const imageReply = engineResult.requestKind === "image_generation";
    const validated = imageReply ? null : validateAnswerQuality({
      answer: engineResult.content, context: qualityContext,
    });
    const assistantContent = validated?.content ?? engineResult.content;
    if (validated) {
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
    // Ordinary text chat is credit-free. Image delivery and its debit commit together.
    await ctx.runMutation(internal.platform.appendAssistantReplyIfMissing, {
      conversationId: args.conversationId, userId: email, content: assistantContent,
      since: replySince,
      imageCreditReference: imageReply ? `regenerate:${args.assistantMessageId}` : undefined,
      replaceFromMessageId: imageReply ? args.assistantMessageId : undefined,
    });

    const updatedUser = await ctx.runQuery(api.users.getUser, {
      sessionToken: args.sessionToken,
    });

    return {
      content: assistantContent,
      credits: updatedUser?.credits ?? 0,
      mode,
      chatProvider: engineResult.providerId,
      chatProviderLabel: getChatProviderLabel(engineResult.providerId),
      usedFallback: engineResult.usedFallback,
      quality: validated?.report ?? null,
    };
  },
});
