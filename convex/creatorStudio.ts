"use node";

import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import type { AiModeId } from "./aiModes";
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

const TOOL_MODE_MAP: Record<string, AiModeId> = {
  "caption-generator": "social",
  "social-post": "social",
  "content-ideas": "social",
  "blog-article": "book",
  "story-creator": "book",
  "speech-writer": "book",
  "email-assistant": "resume",
  "resume-cv": "resume",
  "viral-caption": "social",
  "hook-generator": "social",
  "hashtag-suggestions": "social",
  "content-improver": "social",
  "post-rewriter": "social",
};

function buildToolPrompt(
  toolId: string,
  prompt: string,
  platform?: string,
  context?: string
): string {
  const platformLine = platform
    ? `Target platform: ${platform.replace(/-/g, " ")}.`
    : "";
  const contextLine = context?.trim()
    ? `Additional context:\n${context.trim()}`
    : "";

  const instructions: Record<string, string> = {
    "caption-generator":
      "Write an engaging social media caption. Include a clear hook, value, and optional call-to-action.",
    "social-post":
      "Write a complete social media post ready to publish. Use short paragraphs and platform-appropriate tone.",
    "content-ideas":
      "Generate 8–12 creative content ideas as a numbered list with a one-line description each.",
    "blog-article":
      "Write a structured blog/article draft with title, intro, sections, and conclusion.",
    "story-creator":
      "Write a creative short story with a clear beginning, conflict, and ending.",
    "speech-writer":
      "Write a speech with greeting, main points, and closing. Mark pauses or emphasis where helpful.",
    "email-assistant":
      "Write a professional email with subject line, greeting, body, and sign-off.",
    "resume-cv":
      "Improve or draft resume/CV content with ATS-friendly formatting in markdown.",
    "viral-caption":
      "Write 3 viral-style caption options with different hooks. Label them Option A/B/C.",
    "hook-generator":
      "Write 5 scroll-stopping opening hooks for short-form video or social posts.",
    "hashtag-suggestions":
      "Suggest 15–25 relevant hashtags grouped by reach (broad, niche, branded).",
    "content-improver":
      "Improve the user's draft for clarity, engagement, and readability. Show before/after summary.",
    "post-rewriter":
      "Rewrite the post in 2 alternative styles while keeping the core message.",
  };

  const instruction =
    instructions[toolId] ??
    "Generate helpful, structured creator content based on the user's request.";

  return [
    `Creator Studio task: ${toolId.replace(/-/g, " ")}.`,
    instruction,
    platformLine,
    contextLine,
    "User request:",
    prompt.trim(),
    "Format the response in clear markdown. Be concise, practical, and ready to copy.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export const generateContent = action({
  args: {
    sessionToken: v.string(),
    toolId: v.string(),
    prompt: v.string(),
    platform: v.optional(v.string()),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const verifiedEmail = await requireSessionWithMonitoring(
      args.sessionToken,
      ctx
    );
    const trimmed = args.prompt.trim();
    if (!trimmed) {
      throw new Error("Please describe what you want to create.");
    }

    const usage = await ctx.runQuery(api.credits.getUsageSnapshot, {
      sessionToken: args.sessionToken,
    });
    if (!usage) throw new Error("User not found");
    if (usage.credits < CREDIT_COSTS.writing) {
      throw new Error(
        `Insufficient credits (${CREDIT_COSTS.writing} required, ${usage.credits} available).`
      );
    }

    const mode = TOOL_MODE_MAP[args.toolId] ?? "social";
    const userMessage = buildToolPrompt(
      args.toolId,
      trimmed,
      args.platform,
      args.context
    );

    const qualityContext = prepareAnswerQualityContext({
      mode,
      query: trimmed,
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
      mode,
      query: trimmed,
    });

    const engineResult = await completeChatWithFailover(
      trimChatMessages(
        [
          {
            role: "system",
            content: `${getSystemPrompt(mode)}\n\n${qualityContext.systemPromptAddon}`,
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
        sessionToken: args.sessionToken,
        action: "writing",
        reference: `creator:${args.toolId}`,
        metadata: JSON.stringify({
          source: "creator_studio",
          toolId: args.toolId,
          platform: args.platform ?? null,
        }),
      });
    }

    const updatedUsage = await ctx.runQuery(api.credits.getUsageSnapshot, {
      sessionToken: args.sessionToken,
    });

    return {
      content: validated.content,
      toolId: args.toolId,
      mode,
      credits: updatedUsage?.credits ?? usage.credits,
      usedFallback: engineResult.usedFallback,
      provider: engineResult.providerId,
    };
  },
});
