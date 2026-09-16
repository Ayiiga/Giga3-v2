"use node";

import { action, type ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { getSystemPrompt } from "./aiModes";
import {
  buildRoutingContextFromUser,
  completeChatWithFailover,
  trimChatMessages,
} from "./chatEngine";
import {
  prepareAnswerQualityContext,
  toRetrievalSystemMessage,
  validateAnswerQuality,
} from "./answerQuality";
import { requireSessionWithMonitoring } from "./auth";
import { CREDIT_COSTS } from "./creditsConfig";
import {
  buildVideoScriptGenerationPrompt,
  buildVideoScriptRewritePrompt,
} from "./mediaVideoScriptPrompts";

const MODE = "social" as const;

async function runScriptLlm(
  ctx: ActionCtx,
  sessionToken: string,
  verifiedEmail: string,
  userMessage: string,
  reference: string
) {
  const usage = await ctx.runQuery(api.credits.getUsageSnapshot, { sessionToken });
  if (!usage) throw new Error("User not found");
  if (usage.credits < CREDIT_COSTS.writing) {
    throw new Error(
      `Insufficient credits (${CREDIT_COSTS.writing} required, ${usage.credits} available).`
    );
  }

  const qualityContext = prepareAnswerQualityContext({
    mode: MODE,
    query: userMessage.slice(0, 200),
    history: [{ role: "user", content: userMessage }],
  });

  const hasPurchasedCredits = await ctx.runQuery(
    internal.credits.userHasPurchasedCreditsInternal,
    { userId: verifiedEmail }
  );

  const routing = buildRoutingContextFromUser({
    subscriptionPlan: usage.subscriptionPlan ?? "free",
    subscriptionExpiresAt: usage.subscriptionExpiresAt,
    hasPurchasedCredits: Boolean(hasPurchasedCredits),
    mode: MODE,
    query: userMessage.slice(0, 200),
  });

  const engineResult = await completeChatWithFailover(
    trimChatMessages(
      [
        {
          role: "system",
          content: `${getSystemPrompt(MODE)}\n\n${qualityContext.systemPromptAddon}`,
        },
        ...toRetrievalSystemMessage(qualityContext),
        { role: "user", content: userMessage },
      ],
      4
    ),
    routing
  );

  const validated = validateAnswerQuality({
    answer: engineResult.content,
    context: qualityContext,
  });

  if (engineResult.providerId !== "local_fallback") {
    await ctx.runMutation(api.credits.deductCredits, {
      sessionToken,
      action: "writing",
      reference,
      metadata: JSON.stringify({ source: "media_video_preprod" }),
    });
  }

  const updatedUsage = await ctx.runQuery(api.credits.getUsageSnapshot, { sessionToken });

  return {
    script: validated.content.trim(),
    credits: updatedUsage?.credits ?? usage.credits,
    provider: engineResult.providerId,
    usedFallback: engineResult.usedFallback,
  };
}

export const generateVideoScript = action({
  args: {
    sessionToken: v.string(),
    idea: v.string(),
    clientRequestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const verifiedEmail = await requireSessionWithMonitoring(args.sessionToken, ctx);
    await ctx.runQuery(internal.entitlements.assertFeatureInternal, {
      userId: verifiedEmail,
      feature: "media_studio",
    });
    const idea = args.idea.trim();
    if (!idea) throw new Error("Describe your video idea first.");

    const reference = args.clientRequestId
      ? `preprod-script:${args.clientRequestId}`
      : `preprod-script:${Date.now()}`;

    return runScriptLlm(
      ctx,
      args.sessionToken,
      verifiedEmail,
      buildVideoScriptGenerationPrompt(idea),
      reference
    );
  },
});

export const rewriteVideoScript = action({
  args: {
    sessionToken: v.string(),
    originalScript: v.string(),
    idea: v.optional(v.string()),
    clientRequestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const verifiedEmail = await requireSessionWithMonitoring(args.sessionToken, ctx);
    await ctx.runQuery(internal.entitlements.assertFeatureInternal, {
      userId: verifiedEmail,
      feature: "media_studio",
    });
    const original = args.originalScript.trim();
    if (!original) throw new Error("Add a script to rewrite.");

    const reference = args.clientRequestId
      ? `preprod-rewrite:${args.clientRequestId}`
      : `preprod-rewrite:${Date.now()}`;

    const result = await runScriptLlm(
      ctx,
      args.sessionToken,
      verifiedEmail,
      buildVideoScriptRewritePrompt({ originalScript: original, idea: args.idea }),
      reference
    );

    return {
      ...result,
      originalScript: original,
    };
  },
});
