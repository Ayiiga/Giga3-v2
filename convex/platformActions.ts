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
  shouldUseResponseCache,
} from "./providerRouter";
import { openaiGenerateImage } from "./openaiImageClient";
import type { ActionCtx } from "./_generated/server";

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
    conversationId: string;
  }
): Promise<ChatEngineResult & { cached: boolean }> {
  const routePlan = buildChatRoutePlan({
    tier: args.routing.tier,
    mode: args.mode,
    query: args.query,
    hasAttachments: args.hasAttachments,
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
      await ctx.runMutation(api.users.createUser, { email });
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

    const refreshedUser = await ctx.runQuery(api.users.getUser, {
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

    const systemPrompt =
      getSystemPrompt(mode) +
      buildInterestSystemAddon(parseInterestProfile(refreshedUser?.interestProfile)) +
      "\n\n" +
      qualityContext.systemPromptAddon;

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
        content: assistantContent,
        credits: updatedUser?.credits ?? 0,
        mode,
        chatProvider: "local_fallback",
        chatProviderLabel: getChatProviderLabel("local_fallback"),
        usedFallback: true,
        quality: validatedFailure.report,
      };
    }

    const chatMessages = trimChatMessages([
      { role: "system" as const, content: systemPrompt },
      ...toRetrievalSystemMessage(qualityContext),
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      ...(attachments.length
        ? [
            {
              role: "user" as const,
              content:
                "Process the uploaded attachments first using this pipeline: input detection -> OCR/handwriting/layout/table extraction -> text normalization -> structured reconstruction -> reasoning. Then answer using this structure when applicable: Summary, Extracted Text (OCR), Cleaned Text, Structured Interpretation, Final Answer. If this is biography generation, include OCR Extracted Text, Cleaned Version, Structured Notes, and Final Biography. Never claim analysis unless extraction actually completed and never invent missing text.",
              attachments,
            },
          ]
        : []),
    ]);

    const routing = await resolveRoutingContext(
      ctx,
      email,
      refreshedUser ?? { subscriptionPlan: "free" },
      mode,
      args.content
    );

    const engineResult = await runHybridAiEngine(ctx, {
      email,
      mode,
      query: args.content,
      systemPrompt,
      chatMessages,
      routing,
      hasAttachments: attachments.length > 0,
      conversationId: args.conversationId,
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

    console.info(
      "[quality.sendMessage]",
      JSON.stringify({
        mode,
        conversationId: args.conversationId,
        report: validated.report,
      })
    );

    const chargedAi = engineResult.providerId !== "local_fallback";

    if (chargedAi) {
      if (engineResult.providerId === "openai_image") {
        await ctx.runMutation(internal.credits.deductCreditsInternal, {
          userId: email,
          action: "image",
          reference: args.conversationId,
        });
      } else {
        await ctx.runMutation(internal.credits.deductForChatModeInternal, {
          userId: email,
          mode,
          reference: args.conversationId,
        });
      }
    }

    await ctx.runMutation(internal.platform.appendMessage, {
      conversationId: args.conversationId,
      userId: email,
      role: "assistant",
      content: assistantContent,
    });

    const updatedUser = await ctx.runQuery(api.users.getUser, {
      sessionToken: args.sessionToken,
    });

    const title =
      conv.title === "New chat" || conv.title.endsWith("…")
        ? args.content.slice(0, 48).trim() +
          (args.content.length > 48 ? "…" : "")
        : conv.title;

    if (title !== conv.title) {
      await ctx.runMutation(api.conversations.updateTitle, {
        conversationId: args.conversationId,
        sessionToken: args.sessionToken,
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
      quality: validated.report,
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

    await ctx.runMutation(internal.platform.removeMessagesFrom, {
      conversationId: args.conversationId,
      userId: email,
      fromMessageId: args.assistantMessageId,
    });

    const historyAfter = await ctx.runQuery(api.messages.listByConversation, {
      conversationId: args.conversationId,
      sessionToken: args.sessionToken,
    });

    const refreshedUser = await ctx.runQuery(api.users.getUser, {
      sessionToken: args.sessionToken,
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

    const systemPrompt =
      getSystemPrompt(mode) +
      buildInterestSystemAddon(parseInterestProfile(refreshedUser?.interestProfile)) +
      "\n\n" +
      qualityContext.systemPromptAddon;

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
      hasAttachments: false,
      conversationId: args.conversationId,
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

    console.info(
      "[quality.regenerateMessage]",
      JSON.stringify({
        mode,
        conversationId: args.conversationId,
        report: validated.report,
      })
    );
    const chargedAi = engineResult.providerId !== "local_fallback";

    if (chargedAi) {
      if (engineResult.providerId === "openai_image") {
        await ctx.runMutation(internal.credits.deductCreditsInternal, {
          userId: email,
          action: "image",
          reference: args.conversationId,
        });
      } else {
        await ctx.runMutation(internal.credits.deductForChatModeInternal, {
          userId: email,
          mode,
          reference: args.conversationId,
        });
      }
    }

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
      content: assistantContent,
      credits: updatedUser?.credits ?? 0,
      mode,
      chatProvider: engineResult.providerId,
      chatProviderLabel: getChatProviderLabel(engineResult.providerId),
      usedFallback: engineResult.usedFallback,
      quality: validated.report,
    };
  },
});
