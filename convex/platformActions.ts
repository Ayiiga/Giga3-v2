"use node";

import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import {
  assessImageProcessingCapability,
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

export const sendMessage = action({
  args: {
    userId: v.string(),
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
      (args.mode && isValidMode(args.mode) ? args.mode : conv.mode ?? "general") as AiModeId;
    const attachments = (args.attachments ?? []) as ChatCompletionAttachment[];
    const imageCapability = assessImageProcessingCapability(attachments);

    if (attachments.length > 0) {
      await ctx.runMutation(api.uploadLimits.recordUploads, {
        userId: args.userId,
        files: attachments.map((attachment) => ({
          name: attachment.name,
          sizeBytes: attachment.sizeBytes,
          mimeType: attachment.mimeType,
          kind: attachment.kind,
        })),
      });
    }

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
      const qualityMonitoring = recordQualityObservation(validatedFailure.report);
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
        chatProvider: "local_fallback",
        chatProviderLabel: getChatProviderLabel("local_fallback"),
        usedFallback: true,
        quality: validatedFailure.report,
        qualityMonitoring,
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

    const engineResult = await completeChatWithFailover(chatMessages);
    const validated = validateAnswerQuality({
      answer: engineResult.content,
      context: qualityContext,
    });
    const assistantContent = validated.content;
    const qualityMonitoring = recordQualityObservation(validated.report);
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
        monitoring: qualityMonitoring,
      })
    );

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
      quality: validated.report,
      qualityMonitoring,
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
      (args.mode && isValidMode(args.mode) ? args.mode : conv.mode ?? "general") as AiModeId;

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

    const engineResult = await completeChatWithFailover(chatMessages);
    const validated = validateAnswerQuality({
      answer: engineResult.content,
      context: qualityContext,
    });
    const assistantContent = validated.content;
    const qualityMonitoring = recordQualityObservation(validated.report);
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
        monitoring: qualityMonitoring,
      })
    );
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
      quality: validated.report,
      qualityMonitoring,
    };
  },
});
