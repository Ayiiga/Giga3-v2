"use node";

/**
 * Phase 3 adaptive intelligence backend (additive).
 *
 * Dedicated module for the adaptive AI tutor and AI-assisted marking.
 * The Phase 1/Phase 2 `gigalearnStudio.generateContent` pipeline is left
 * untouched — this module reuses the same auth, credits, routing and
 * failover primitives for conversational tutor turns and marking.
 *
 * Privacy: every function here operates on the caller's own session only.
 * No endpoint exposes another learner's performance data.
 */
import { action, type ActionCtx } from "./_generated/server";
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
import {
  buildMethodologyPromptBlock,
  getMethodology,
  selectMethodologiesForContext,
} from "../web/lib/gigalearn/methodologies";
import { getLevel, resolveLegacyLevelId } from "../web/lib/gigalearn/curriculumEngine";

export const TUTOR_MODES = [
  "explain",
  "simplify",
  "example",
  "hint",
  "check",
  "practice",
  "correct",
  "challenge",
  "socratic",
  "ask",
] as const;

export type TutorMode = (typeof TUTOR_MODES)[number];

const tutorModeValidator = v.union(
  v.literal("explain"),
  v.literal("simplify"),
  v.literal("example"),
  v.literal("hint"),
  v.literal("check"),
  v.literal("practice"),
  v.literal("correct"),
  v.literal("challenge"),
  v.literal("socratic"),
  v.literal("ask")
);

const curriculumContextValidator = v.object({
  country: v.optional(v.string()),
  curriculum: v.optional(v.string()),
  level: v.optional(v.string()),
  grade: v.optional(v.string()),
  subject: v.optional(v.string()),
  strand: v.optional(v.string()),
  subStrand: v.optional(v.string()),
  contentStandard: v.optional(v.string()),
  indicator: v.optional(v.string()),
  topic: v.optional(v.string()),
  learningObjective: v.optional(v.string()),
  countryId: v.optional(v.string()),
  curriculumId: v.optional(v.string()),
  levelId: v.optional(v.string()),
  subjectId: v.optional(v.string()),
  methodologyIds: v.optional(v.array(v.string())),
});

type CurriculumContext = {
  country?: string;
  curriculum?: string;
  level?: string;
  grade?: string;
  subject?: string;
  strand?: string;
  subStrand?: string;
  contentStandard?: string;
  indicator?: string;
  topic?: string;
  learningObjective?: string;
  countryId?: string;
  curriculumId?: string;
  levelId?: string;
  subjectId?: string;
  methodologyIds?: string[];
};

function contextLines(ctx: CurriculumContext): string[] {
  const lines: string[] = [];
  if (ctx.country) lines.push(`Country: ${ctx.country}.`);
  if (ctx.curriculum) lines.push(`Curriculum: ${ctx.curriculum}.`);
  if (ctx.level) lines.push(`Level: ${ctx.level}.`);
  if (ctx.grade) lines.push(`Grade: ${ctx.grade}.`);
  if (ctx.subject) lines.push(`Subject: ${ctx.subject}.`);
  if (ctx.strand) lines.push(`Strand: ${ctx.strand}.`);
  if (ctx.subStrand) lines.push(`Sub-strand: ${ctx.subStrand}.`);
  if (ctx.contentStandard) lines.push(`Content Standard: ${ctx.contentStandard}.`);
  if (ctx.indicator) lines.push(`Indicator: ${ctx.indicator}.`);
  if (ctx.topic) lines.push(`Topic: ${ctx.topic}.`);
  if (ctx.learningObjective) lines.push(`Learning objective: ${ctx.learningObjective}.`);
  const ids = [
    ctx.countryId && `countryId=${ctx.countryId}`,
    ctx.curriculumId && `curriculumId=${ctx.curriculumId}`,
    ctx.levelId && `educationLevelId=${ctx.levelId}`,
    ctx.subjectId && `subjectId=${ctx.subjectId}`,
  ].filter(Boolean);
  if (ids.length) lines.push(`Stable curriculum IDs: ${ids.join(", ")}.`);
  return lines;
}

const TUTOR_MODE_PROMPTS: Record<TutorMode, string> = {
  explain: "Explain the concept at the learner's stated grade, with one concrete example and a one-line recap.",
  simplify: "Provide a simpler explanation: short sentences, everyday words, one tiny example. Never talk down to the learner.",
  example: "Give an appropriate worked example for the topic, using Ghanaian everyday life where helpful, then a second quick example to try mentally.",
  hint: "Provide guidance without immediately revealing the answer: point at the useful first step or the key idea to recall, then ask the learner to try.",
  check: "Ask one targeted check-understanding question about the topic. Do not answer it — wait for the learner.",
  practice: "Generate one more practice question on the topic at the learner's grade, with difficulty matched to any performance summary given. Do not reveal the answer yet.",
  correct: "The learner gave an incorrect response (see conversation). Explain what was wrong, why the correct reasoning works, and give one similar question to retry.",
  challenge: "The learner is doing well — increase difficulty appropriately with a challenging but fair question or extension, and explain why it stretches them.",
  socratic:
    "Use Socratic tutoring: ask ONE guiding question and stop. When the learner responds, evaluate it, give a hint if necessary, then ask the next guiding question. Reveal the answer only when the learner has earned it or is stuck after several tries, then explain the reasoning. Never dump the full answer first.",
  ask: "Answer the learner's curriculum-aware question directly and accurately for their grade, with a brief example.",
};

const TUTOR_BASE_RULES = [
  "You are a warm, encouraging Ghanaian classroom tutor.",
  "Treat the selected subject as exact context — never generic content. Every explanation, example and question must fit the stated country, curriculum, level, grade, subject, strand and topic.",
  "Adapt vocabulary, depth and pacing to the stated grade — simpler language and concrete examples for lower grades.",
  "Never present invented strands or standards as official NaCCA content.",
  "For Career Technology practical content: clearly identify safety requirements and the need for appropriate teacher/supervisor oversight. Never encourage unsafe practical experimentation.",
  "Keep replies focused and mobile-readable: short paragraphs, one idea at a time.",
];

async function chargeAndRoute(
  ctx: ActionCtx,
  args: { sessionToken: string; action: "chat" | "writing"; reference: string; metadata: string; query: string }
) {
  const verifiedEmail: string = await requireSessionWithMonitoring(args.sessionToken, ctx);
  await ctx.runQuery(internal.entitlements.assertFeatureInternal, {
    userId: verifiedEmail,
    feature: "creator_studio",
  });
  const usage = await ctx.runQuery(api.credits.getUsageSnapshot, {
    sessionToken: args.sessionToken,
  });
  if (!usage) throw new Error("User not found");
  const cost = args.action === "chat" ? CREDIT_COSTS.chat : CREDIT_COSTS.writing;
  if (usage.credits < cost) {
    throw new Error(`Insufficient credits (${cost} required, ${usage.credits} available).`);
  }
  const hasPurchasedCredits = await ctx.runQuery(
    internal.credits.userHasPurchasedCreditsInternal,
    { userId: verifiedEmail }
  );
  const mode: AiModeId = "gigalearn";
  const routing = buildRoutingContextFromUser({
    subscriptionPlan: usage.subscriptionPlan ?? "free",
    subscriptionExpiresAt: usage.subscriptionExpiresAt,
    hasPurchasedCredits: Boolean(hasPurchasedCredits),
    mode,
    query: args.query,
  });
  return { verifiedEmail, usage, routing, mode };
}

/** Adaptive tutor turn — Socratic or direct, always curriculum-grounded. */
export const tutorTurn = action({
  args: {
    sessionToken: v.string(),
    mode: tutorModeValidator,
    context: curriculumContextValidator,
    studentInput: v.string(),
    history: v.optional(
      v.array(v.object({ role: v.union(v.literal("user"), v.literal("assistant")), content: v.string() }))
    ),
    /** Learner's own recent performance, summarized client-side (authorized). */
    performanceSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const studentInput = args.studentInput.trim().slice(0, 2000);
    if (!studentInput && args.mode !== "check" && args.mode !== "practice") {
      throw new Error("Tell the tutor what you want to work on.");
    }
    const { usage, routing, mode } = await chargeAndRoute(ctx, {
      sessionToken: args.sessionToken,
      action: "chat",
      reference: `gigalearn-tutor:${args.mode}`,
      metadata: JSON.stringify({
        source: "gigalearn-tutor",
        mode: args.mode,
        subjectId: args.context.subjectId ?? null,
        levelId: args.context.levelId ?? null,
        curriculumId: args.context.curriculumId ?? null,
      }),
      query: studentInput || args.mode,
    });

    const levelDef = args.context.levelId
      ? getLevel(resolveLegacyLevelId(args.context.levelId))
      : undefined;
    const explicitMethods =
      args.context.methodologyIds
        ?.map((id) => getMethodology(id))
        .filter((m): m is NonNullable<typeof m> => Boolean(m)) ?? [];
    const methods =
      explicitMethods.length > 0
        ? explicitMethods
        : selectMethodologiesForContext({
            levelBand: levelDef?.band,
            subjectId: args.context.subjectId,
            topic: args.context.topic,
            max: 4,
          });
    const methodologyBlock = buildMethodologyPromptBlock(methods, {
      levelBand: levelDef?.band,
      gradeLabel: args.context.grade ?? levelDef?.gradeLabel,
    });

    const systemPrompt = [
      ...TUTOR_BASE_RULES,
      `Tutor mode: ${args.mode}. ${TUTOR_MODE_PROMPTS[args.mode as TutorMode]}`,
      "Curriculum context (stable IDs are authoritative; display names are for presentation):",
      ...contextLines(args.context),
      methodologyBlock,
      args.performanceSummary?.trim()
        ? `Learner performance (their own authorized history — adapt difficulty, do not shame):\n${args.performanceSummary.trim().slice(0, 1200)}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const qualityContext = prepareAnswerQualityContext({
      mode,
      query: studentInput || args.mode,
      history: [{ role: "user", content: studentInput || args.mode }],
    });

    const prior = (args.history ?? []).slice(-8).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content.slice(0, 1500),
    }));

    const engineResult = await completeChatWithFailover(
      trimChatMessages(
        [
          { role: "system", content: `${getSystemPrompt(mode)}\n\n${systemPrompt}\n\n${qualityContext.systemPromptAddon}` },
          ...toRetrievalSystemMessage(qualityContext),
          ...prior,
          {
            role: "user",
            content: studentInput || `Begin the ${args.mode} step for ${args.context.topic || args.context.subject || "this topic"}.`,
          },
        ],
        12
      ),
      routing
    );

    const validated = validateAnswerQuality({ answer: engineResult.content, context: qualityContext });

    if (engineResult.providerId !== "local_fallback") {
      await ctx.runMutation(api.credits.deductCredits, {
        sessionToken: args.sessionToken,
        action: "chat",
        reference: `gigalearn-tutor:${args.mode}`,
        metadata: JSON.stringify({ source: "gigalearn-tutor", mode: args.mode }),
      });
    }

    const updatedUsage = await ctx.runQuery(api.credits.getUsageSnapshot, {
      sessionToken: args.sessionToken,
    });

    return {
      reply: validated.content,
      mode: args.mode,
      credits: updatedUsage?.credits ?? usage.credits,
      usedFallback: engineResult.usedFallback,
      provider: engineResult.providerId,
    };
  },
});

export interface MarkingVerdict {
  score: number;
  maxScore: number;
  correct: boolean;
  correctAnswer: string;
  explanation: string;
  whatWentWell: string;
  whatNeedsImprovement: string;
  suggestedNextStep: string;
  errorCategory:
    | "concept-misunderstanding"
    | "calculation-error"
    | "misreading"
    | "missing-step"
    | "vocabulary-issue"
    | "incomplete-response"
    | "careless-error"
    | "unknown";
  errorConfidence: "high" | "medium" | "low";
}

function parseMarkingJson(content: string): MarkingVerdict | null {
  const match = content.match(/```json\s*([\s\S]*?)```/i);
  if (!match?.[1]) return null;
  try {
    const raw = JSON.parse(match[1]) as Partial<MarkingVerdict>;
    if (typeof raw.score !== "number" || !raw.explanation) return null;
    const allowed = [
      "concept-misunderstanding",
      "calculation-error",
      "misreading",
      "missing-step",
      "vocabulary-issue",
      "incomplete-response",
      "careless-error",
      "unknown",
    ] as const;
    const errorCategory = allowed.includes(raw.errorCategory as (typeof allowed)[number])
      ? (raw.errorCategory as MarkingVerdict["errorCategory"])
      : "unknown";
    return {
      score: Math.max(0, Math.min(100, Math.round(raw.score))),
      maxScore: typeof raw.maxScore === "number" ? raw.maxScore : 100,
      correct: Boolean(raw.correct),
      correctAnswer: String(raw.correctAnswer ?? "").slice(0, 2000),
      explanation: String(raw.explanation).slice(0, 4000),
      whatWentWell: String(raw.whatWentWell ?? "").slice(0, 2000),
      whatNeedsImprovement: String(raw.whatNeedsImprovement ?? "").slice(0, 2000),
      suggestedNextStep: String(raw.suggestedNextStep ?? "").slice(0, 1000),
      errorCategory,
      errorConfidence: raw.errorConfidence === "high" || raw.errorConfidence === "medium" ? raw.errorConfidence : "low",
    };
  } catch {
    return null;
  }
}

/**
 * AI-assisted marking with feedback.
 * Assistance only: teachers retain control over official assessment
 * decisions, and subjective feedback is identified as AI-generated.
 */
export const markAnswer = action({
  args: {
    sessionToken: v.string(),
    question: v.string(),
    studentAnswer: v.string(),
    correctAnswer: v.optional(v.string()),
    markingGuide: v.optional(v.string()),
    maxScore: v.optional(v.number()),
    context: curriculumContextValidator,
  },
  handler: async (ctx, args) => {
    const question = args.question.trim().slice(0, 3000);
    const studentAnswer = args.studentAnswer.trim().slice(0, 3000);
    if (!question || !studentAnswer) throw new Error("A question and an answer are required for marking.");
    const { usage, routing, mode } = await chargeAndRoute(ctx, {
      sessionToken: args.sessionToken,
      action: "writing",
      reference: "gigalearn-marking",
      metadata: JSON.stringify({
        source: "gigalearn-marking",
        subjectId: args.context.subjectId ?? null,
        levelId: args.context.levelId ?? null,
      }),
      query: question,
    });

    const userMessage = [
      "Mark this learner response as AI marking assistance (not an official grade — the teacher makes official assessment decisions).",
      ...contextLines(args.context),
      `Question:\n${question}`,
      `Learner answer:\n${studentAnswer}`,
      args.correctAnswer?.trim() ? `Reference answer:\n${args.correctAnswer.trim().slice(0, 2000)}` : "",
      args.markingGuide?.trim() ? `Marking guide:\n${args.markingGuide.trim().slice(0, 2000)}` : "",
      `Maximum score: ${Math.max(1, Math.min(100, Math.round(args.maxScore ?? 100)))}.`,
      "Respond with encouraging markdown feedback (score, correct answer, explanation, what was done correctly, what needs improvement, suggested next step), then append a fenced ```json block with exactly: {\"score\": number 0-100, \"maxScore\": number, \"correct\": boolean, \"correctAnswer\": string, \"explanation\": string, \"whatWentWell\": string, \"whatNeedsImprovement\": string, \"suggestedNextStep\": string, \"errorCategory\": one of concept-misunderstanding|calculation-error|misreading|missing-step|vocabulary-issue|incomplete-response|careless-error|unknown, \"errorConfidence\": high|medium|low}.",
      "Classify the mistake only where evidence supports it — use errorCategory \"unknown\" with low confidence when evidence is insufficient. Identify the feedback as AI-generated assistance; do not claim perfect grading accuracy.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const qualityContext = prepareAnswerQualityContext({
      mode,
      query: question,
      history: [{ role: "user", content: userMessage }],
    });

    const engineResult = await completeChatWithFailover(
      trimChatMessages(
        [
          {
            role: "system",
            content: `${getSystemPrompt(mode)}\n\n${TUTOR_BASE_RULES.join("\n")}\n\n${qualityContext.systemPromptAddon}`,
          },
          ...toRetrievalSystemMessage(qualityContext),
          { role: "user", content: userMessage },
        ],
        4
      ),
      routing
    );

    const validated = validateAnswerQuality({ answer: engineResult.content, context: qualityContext });

    if (engineResult.providerId !== "local_fallback") {
      await ctx.runMutation(api.credits.deductCredits, {
        sessionToken: args.sessionToken,
        action: "writing",
        reference: "gigalearn-marking",
        metadata: JSON.stringify({ source: "gigalearn-marking" }),
      });
    }

    const updatedUsage = await ctx.runQuery(api.credits.getUsageSnapshot, {
      sessionToken: args.sessionToken,
    });

    return {
      feedback: validated.content,
      verdict: parseMarkingJson(validated.content),
      credits: updatedUsage?.credits ?? usage.credits,
      usedFallback: engineResult.usedFallback,
      provider: engineResult.providerId,
    };
  },
});
