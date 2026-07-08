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
  "quiz-generator": "gigalearn",
  "assignment-generator": "gigalearn",
  "lesson-notes": "gigalearn",
  "study-plan": "gigalearn",
  "practice-questions": "waec",
  "exam-prep": "waec",
  "worksheet-generator": "gigalearn",
  "parent-summary": "gigalearn",
  "homework-explain": "homework",
  "topic-explainer": "gigalearn",
  "revision-guide": "waec",
  "class-activity": "gigalearn",
  "progress-report": "gigalearn",
  "learning-tips": "gigalearn",
};

function buildToolPrompt(
  toolId: string,
  prompt: string,
  curriculum?: string,
  subject?: string,
  level?: string,
  context?: string
): string {
  const curriculumLine = curriculum
    ? `Curriculum / exam board: ${curriculum.replace(/-/g, " ").toUpperCase()}.`
    : "";
  const subjectLine = subject ? `Subject: ${subject.replace(/-/g, " ")}.` : "";
  const levelLine = level ? `Education level: ${level.replace(/-/g, " ")}.` : "";
  const contextLine = context?.trim()
    ? `Additional context:\n${context.trim()}`
    : "";

  const instructions: Record<string, string> = {
    "quiz-generator":
      "Generate a structured quiz with numbered questions, multiple-choice options where appropriate, and an answer key at the end.",
    "assignment-generator":
      "Create a clear assignment with instructions, tasks, marking criteria, and expected deliverables.",
    "lesson-notes":
      "Write comprehensive lesson notes with learning objectives, key concepts, examples (use African context where helpful), and a short summary.",
    "study-plan":
      "Create a personalized study plan with daily/weekly goals, topics to cover, revision slots, and exam preparation tips.",
    "practice-questions":
      "Generate exam-style practice questions aligned to the stated curriculum. Include worked solutions step by step.",
    "exam-prep":
      "Provide focused exam preparation: likely topics, common question types, revision checklist, and 3 timed practice questions with answers.",
    "worksheet-generator":
      "Create a printable worksheet for teachers with exercises, space for student answers, and a teacher answer key.",
    "parent-summary":
      "Explain the topic in parent-friendly language: what the child is learning, how to support at home, and simple check questions.",
    "homework-explain":
      "Solve or explain the homework step by step. Show reasoning, formulas used, and the final answer. Encourage understanding.",
    "topic-explainer":
      "Explain the topic simply for the learner's level with examples, analogies, and a quick recap.",
    "revision-guide":
      "Create a revision guide with key facts, common mistakes, memory tips, and mini self-test questions.",
    "class-activity":
      "Design an engaging classroom activity with materials, steps, timing, and learning outcomes.",
    "progress-report":
      "Draft a constructive progress summary template a teacher or parent can adapt — strengths, areas to improve, next steps.",
    "learning-tips":
      "Give practical study tips tailored to the subject, level, and African school context (limited resources, exam focus).",
  };

  const instruction =
    instructions[toolId] ??
    "Generate helpful, structured educational content based on the user's request.";

  return [
    `GigaLearn task: ${toolId.replace(/-/g, " ")}.`,
    instruction,
    curriculumLine,
    subjectLine,
    levelLine,
    contextLine,
    "User request:",
    prompt.trim(),
    "Format the response in clear markdown. Use headings, lists, and worked examples. Be accurate and age-appropriate.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export const generateContent = action({
  args: {
    sessionToken: v.string(),
    toolId: v.string(),
    prompt: v.string(),
    curriculum: v.optional(v.string()),
    subject: v.optional(v.string()),
    level: v.optional(v.string()),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const verifiedEmail = await requireSessionWithMonitoring(
      args.sessionToken,
      ctx
    );
    const trimmed = args.prompt.trim();
    if (!trimmed) {
      throw new Error("Please describe what you want to learn or create.");
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

    const mode = TOOL_MODE_MAP[args.toolId] ?? "gigalearn";
    const userMessage = buildToolPrompt(
      args.toolId,
      trimmed,
      args.curriculum,
      args.subject,
      args.level,
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
        reference: `gigalearn:${args.toolId}`,
        metadata: JSON.stringify({
          source: "gigalearn",
          toolId: args.toolId,
          curriculum: args.curriculum ?? null,
          subject: args.subject ?? null,
          level: args.level ?? null,
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
