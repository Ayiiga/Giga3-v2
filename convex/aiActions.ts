"use node";

import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { completeChatWithFailover, trimChatMessages } from "./chatEngine";
import { getSystemPrompt } from "./aiModes";
import {
  prepareAnswerQualityContext,
  recordQualityObservation,
  toRetrievalSystemMessage,
  validateAnswerQuality,
} from "./answerQuality";

function hasHallucinationRisk(flags: string[]): boolean {
  return flags.some((flag) =>
    [
      "missing_citations",
      "unsupported_claims",
      "fabricated_citations",
      "high_stakes_unverified",
      "ocr_not_verified",
    ].includes(flag)
  );
}

export const askAI = action({
  args: {
    email: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const { email, message } = args;

    let user = await ctx.runQuery(api.users.getUser, { email });
    if (!user) {
      await ctx.runMutation(api.users.createUser, { email });
      user = await ctx.runQuery(api.users.getUser, { email });
    }
    if (!user) {
      throw new Error("User not found");
    }
    if (user.tokens <= 0) {
      throw new Error("Insufficient tokens. Please purchase more tokens.");
    }

    const qualityContext = prepareAnswerQualityContext({
      mode: "general",
      query: message,
      history: [{ role: "user", content: message }],
    });

    const engineResult = await completeChatWithFailover(
      trimChatMessages(
        [
          {
            role: "system",
            content: `${getSystemPrompt("general")}\n\n${qualityContext.systemPromptAddon}`,
          },
          ...toRetrievalSystemMessage(qualityContext),
          { role: "user", content: message },
        ],
        4
      )
    );

    const validated = validateAnswerQuality({
      answer: engineResult.content,
      context: qualityContext,
    });
    const aiContent = validated.content;
    const qualityMonitoring = recordQualityObservation(validated.report);
    await ctx.runMutation(internal.qualityDashboard.recordResponseMetric, {
      responseMode: validated.report.responseMode,
      confidenceLabel: validated.report.confidenceLabel,
      citationCount: validated.report.citationCount,
      verificationVisible: validated.report.verificationVisible,
      verificationPassed: !hasHallucinationRisk(validated.report.flags),
      hasHallucinationRisk: hasHallucinationRisk(validated.report.flags),
    });
    const chargedAi = engineResult.providerId !== "local_fallback";

    const newTokens = chargedAi ? Math.max(0, user.tokens - 1) : user.tokens;

    await ctx.runMutation(internal.ai.persistLegacyChat, {
      email,
      userMessage: message,
      assistantMessage: aiContent,
      newTokens,
    });

    return {
      content: aiContent,
      tokens: newTokens,
      usedFallback: engineResult.usedFallback,
      chatProvider: engineResult.providerId,
      quality: validated.report,
      qualityMonitoring,
    };
  },
});
