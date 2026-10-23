/**
 * GigaLearn Technology Learning Hub — interactive practice sessions.
 * Answer keys stay server-side until grade/submit. Additive to Academy.
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, tryRequireSession } from "./auth";
import { isSubscriptionActive } from "./creditsConfig";
import { sessionArgs } from "./validators";
import {
  buildSessionOptionPermutations,
  getTechBankQuestionById,
  getTechBankQuestions,
  gradeTechAnswers,
  listLoadedTechBankSlugs,
  presentTechQuestion,
  selectTechQuestionIds,
  type OptionPermutationMap,
} from "../web/lib/gigalearn/academy/techBanks/techBankServer";
import {
  displayCorrectIndex,
  toOriginalOptionIndex,
} from "../web/lib/gigalearn/examPractice/optionShuffle";
import { getTechCourseMeta, listTechCourseMeta } from "../web/lib/gigalearn/academy/techBanks/techBankMeta";
import { getBuiltinAcademyCourse } from "../web/lib/gigalearn/academy/courseCatalog";
import type { TechPracticeMode } from "../web/lib/gigalearn/academy/techBanks/techBankTypes";
import {
  hasExamPracticePremiumAccess,
  isExamPracticeCourseSlug,
  resolveExamPracticeSessionCount,
  shouldAbandonPriorExamInProgress,
} from "../web/lib/gigalearn/examPractice/practiceLimits";
import { sanitizePracticeExplanation } from "../web/lib/gigalearn/examPractice/sanitizePracticeStem";

const MODE_VALIDATOR = v.union(
  v.literal("learn"),
  v.literal("practice_test"),
  v.literal("timed"),
  v.literal("revision"),
  v.literal("topic"),
  v.literal("random"),
  v.literal("challenge")
);

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase().slice(0, 80);
}

function parseAnswers(raw: string): Record<string, number> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, number> = {};
    for (const [k, val] of Object.entries(parsed as Record<string, unknown>)) {
      // MCQ uses 0–3; True/False uses 0–1. Cap at 3 for storage hygiene.
      if (typeof val === "number" && Number.isInteger(val) && val >= 0 && val <= 3) {
        out[k.slice(0, 120)] = val;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function parseIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Exam Practice premium packs may request up to 500 items.
    return parsed.map((x) => String(x).slice(0, 120)).filter(Boolean).slice(0, 500);
  } catch {
    return [];
  }
}

function parseOptionPermutations(raw: string | undefined): OptionPermutationMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: OptionPermutationMap = {};
    for (const [qid, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      const perm = value
        .map((n) => (typeof n === "number" && Number.isInteger(n) ? n : -1))
        .filter((n) => n >= 0 && n <= 3);
      if (perm.length >= 2 && perm.length <= 4) {
        out[qid.slice(0, 120)] = perm;
      }
    }
    return out;
  } catch {
    return {};
  }
}

async function requireActiveEnrolment(ctx: { db: any }, email: string, courseSlug: string) {
  const slug = normalizeSlug(courseSlug);
  const course = getBuiltinAcademyCourse(slug);
  const meta = getTechCourseMeta(slug);
  if (!course || !meta) {
    throw new Error("Practice course not found.");
  }
  const loaded = listLoadedTechBankSlugs().includes(slug);
  if (meta.awaitingMaterials || (!loaded && meta.approvedQuestionCount === 0)) {
    throw new Error(
      "Question bank materials are not available yet for this course. Check back after the source PDF is imported."
    );
  }
  if (loaded && getTechBankQuestions(slug).length === 0) {
    throw new Error("No practiceable questions are available for this bank yet.");
  }
  const enrolment = await ctx.db
    .query("gigaLearnAcademyEnrolments")
    .withIndex("by_user_course", (q: any) => q.eq("userId", email).eq("courseSlug", slug))
    .first();
  if (!enrolment || enrolment.status === "withdrawn") {
    throw new Error("Enrol in this Academy course before starting practice.");
  }
  return { enrolment, slug, meta, course };
}

export const listTechHubCatalogue = query({
  args: {},
  handler: async () => {
    return listTechCourseMeta().map((m) => ({
      ...m,
      loadedOnServer: listLoadedTechBankSlugs().includes(m.courseSlug),
      catalogueTitle: getBuiltinAcademyCourse(m.courseSlug)?.title ?? m.title,
    }));
  },
});

export const getTechCoursePracticeSummary = query({
  args: { ...sessionArgs, courseSlug: v.string() },
  handler: async (ctx, args) => {
    const email = await tryRequireSession(args.sessionToken, ctx);
    if (!email) return null;
    const slug = normalizeSlug(args.courseSlug);
    const meta = getTechCourseMeta(slug);
    if (!meta) return null;

    const enrolment = await ctx.db
      .query("gigaLearnAcademyEnrolments")
      .withIndex("by_user_course", (q: any) => q.eq("userId", email).eq("courseSlug", slug))
      .first();

    const sessions = await ctx.db
      .query("gigaLearnTechSessions")
      .withIndex("by_user_course", (q: any) => q.eq("userId", email).eq("courseSlug", slug))
      .order("desc")
      .take(40);

    const graded = sessions.filter((s: { status: string }) => s.status === "graded");
    const scores = graded
      .map((s: { score?: number; maxScore?: number }) =>
        s.maxScore ? Math.round(((s.score ?? 0) / s.maxScore) * 100) : null
      )
      .filter((n: number | null): n is number => n != null);

    const incorrectIds = new Set<string>();
    for (const s of graded) {
      if (!s.resultsJson) continue;
      try {
        const results = JSON.parse(s.resultsJson) as Array<{
          questionId: string;
          correct: boolean;
        }>;
        for (const r of results) {
          if (!r.correct) incorrectIds.add(r.questionId);
        }
      } catch {
        /* ignore */
      }
    }

    return {
      meta,
      enrolled: Boolean(enrolment && enrolment.status !== "withdrawn"),
      enrolmentStatus: enrolment?.status ?? null,
      progressPercent: enrolment?.progressPercent ?? 0,
      sessionsCompleted: graded.length,
      bestScorePercent: scores.length ? Math.max(...scores) : null,
      latestScorePercent: scores.length ? scores[0] : null,
      revisionQuestionCount: incorrectIds.size,
      topicCounts: meta.topics,
      approvedQuestionCount: meta.approvedQuestionCount,
      awaitingMaterials: meta.awaitingMaterials,
    };
  },
});

export const startTechPracticeSession = mutation({
  args: {
    ...sessionArgs,
    courseSlug: v.string(),
    mode: MODE_VALIDATOR,
    topicId: v.optional(v.string()),
    count: v.optional(v.number()),
    timeLimitMinutes: v.optional(v.number()),
    /** Optional: "mcq" | "true_false" — type-specific practice when the bank has that format. */
    questionType: v.optional(v.union(v.literal("mcq"), v.literal("true_false"))),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const { slug, meta } = await requireActiveEnrolment(ctx, email, args.courseSlug);
    const mode = args.mode as TechPracticeMode;
    const questionType = args.questionType;

    if ((mode === "topic" || mode === "challenge") && !args.topicId?.trim()) {
      // challenge may omit topic — use full bank; topic mode requires topic
      if (mode === "topic") throw new Error("Choose a topic for topic practice.");
    }

    let revisionIds: string[] | undefined;
    if (mode === "revision") {
      const prior = await ctx.db
        .query("gigaLearnTechSessions")
        .withIndex("by_user_course", (q: any) => q.eq("userId", email).eq("courseSlug", slug))
        .order("desc")
        .take(30);
      const wrong = new Set<string>();
      for (const s of prior) {
        if (s.status !== "graded" || !s.resultsJson) continue;
        try {
          const results = JSON.parse(s.resultsJson) as Array<{
            questionId: string;
            correct: boolean;
          }>;
          for (const r of results) {
            if (!r.correct) wrong.add(r.questionId);
          }
        } catch {
          /* ignore */
        }
      }
      revisionIds = [...wrong];
      if (revisionIds.length === 0) {
        throw new Error("No incorrect answers to revise yet. Complete a practice test first.");
      }
    }

    const defaultCount = isExamPracticeCourseSlug(slug)
      ? mode === "learn"
        ? 10
        : 50
      : mode === "learn"
        ? 10
        : mode === "timed"
          ? 20
          : mode === "practice_test"
            ? 20
            : 10;

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    // Credit-pack purchase unlock (not residual balance). Matches AI premium tier.
    const hasPurchasedCredits = user
      ? await ctx.db
          .query("creditLogs")
          .withIndex("by_user_created", (q) => q.eq("userId", email))
          .order("desc")
          .take(50)
          .then((rows) => rows.some((row) => row.action === "credit_purchase"))
      : false;
    // Basic (GHS 60), Pro, and Premium all qualify when unexpired.
    const subscriptionActive = isSubscriptionActive(
      user?.subscriptionPlan ?? "free",
      user?.subscriptionExpiresAt
    );
    // Resolve entitlement before sizing the pool so free callers never see
    // premium-only stems (accessTier gate) and bankSize reflects their pool.
    const premiumAccess = hasExamPracticePremiumAccess({
      subscriptionActive,
      hasPurchasedCredits,
      credits: user?.credits ?? 0,
    });
    const bankSize = getTechBankQuestions(slug, {
      freeTierOnly: !premiumAccess,
      questionType,
    }).length;
    if (questionType && bankSize === 0) {
      throw new Error(
        questionType === "true_false"
          ? "True/False practice is not yet available for this rank. Multiple-choice items may still be available."
          : "Multiple-choice practice is not yet available for this selection."
      );
    }
    const resolved = resolveExamPracticeSessionCount({
      requested: args.count ?? defaultCount,
      courseSlug: slug,
      bankSize,
      subscriptionActive,
      hasPurchasedCredits,
      // Residual balance must not unlock — pass through only for API clarity.
      credits: user?.credits ?? 0,
    });
    const count = resolved.count;
    const seed = Date.now() ^ Math.floor(Math.random() * 1e9);
    const questionIds = selectTechQuestionIds({
      courseSlug: slug,
      mode,
      topicId: args.topicId?.trim() || undefined,
      count,
      seed,
      revisionQuestionIds: revisionIds,
      premiumAccess: resolved.premiumAccess,
      questionType,
    });
    if (questionIds.length === 0) {
      throw new Error("No approved questions available for this selection.");
    }

    const now = Date.now();
    let endsAt: number | undefined;
    if (mode === "timed") {
      const mins = Math.max(5, Math.min(90, Math.floor(args.timeLimitMinutes ?? 30)));
      endsAt = now + mins * 60_000;
    }

    // Exam Practice: abandon prior in-progress sessions for this course so
    // concurrent starts cannot pile up large server-side answer-key sessions.
    if (shouldAbandonPriorExamInProgress(slug)) {
      const priorOpen = await ctx.db
        .query("gigaLearnTechSessions")
        .withIndex("by_user_course", (q: any) =>
          q.eq("userId", email).eq("courseSlug", slug)
        )
        .order("desc")
        .take(20);
      for (const prior of priorOpen) {
        if (prior.status !== "in_progress") continue;
        await ctx.db.patch(prior._id, {
          status: "submitted",
          submittedAt: now,
          updatedAt: now,
        });
      }
    }

    const bankQuestions = questionIds.map((id) => getTechBankQuestionById(slug, id)!);
    const optionPermutations = buildSessionOptionPermutations(
      bankQuestions.map((q) => ({
        questionId: q.questionId,
        options: q.options,
        questionType: q.questionType,
      })),
      seed
    );

    const sessionId = await ctx.db.insert("gigaLearnTechSessions", {
      userId: email,
      courseSlug: slug,
      mode,
      topicId: args.topicId?.trim() || undefined,
      questionIdsJson: JSON.stringify(questionIds),
      answersJson: "{}",
      optionPermutationsJson: JSON.stringify(optionPermutations),
      status: "in_progress",
      endsAt,
      startedAt: now,
      updatedAt: now,
    });

    return {
      sessionId,
      courseSlug: slug,
      mode,
      topicId: args.topicId?.trim() || null,
      endsAt: endsAt ?? null,
      questionCount: questionIds.length,
      premiumAccess: resolved.premiumAccess,
      approvedBankSize: meta.approvedQuestionCount,
      questions: bankQuestions.map((q) =>
        presentTechQuestion(q, optionPermutations[q.questionId])
      ),
    };
  },
});

export const getTechPracticeSession = query({
  args: { ...sessionArgs, sessionId: v.id("gigaLearnTechSessions") },
  handler: async (ctx, args) => {
    const email = await tryRequireSession(args.sessionToken, ctx);
    if (!email) return null;
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== email) {
      return null;
    }

    const now = Date.now();
    const timedOut =
      session.mode === "timed" &&
      session.endsAt != null &&
      now >= session.endsAt &&
      session.status === "in_progress";

    const questionIds = parseIds(session.questionIdsJson);
    const answers = parseAnswers(session.answersJson);
    const optionPermutations = parseOptionPermutations(session.optionPermutationsJson);
    const revealKeys =
      session.status === "graded" ||
      session.status === "submitted" ||
      (session.mode === "learn" && false);

    const questions = questionIds.map((id) => {
      const q = getTechBankQuestionById(session.courseSlug, id);
      if (!q) {
        return {
          questionId: id,
          topicId: "unknown",
          topicLabel: "Unavailable",
          questionText: "Question unavailable",
          options: [],
          difficulty: "beginner" as const,
          sourceQuestionNumber: 0,
          reviewStatus: "rejected" as const,
        };
      }
      return presentTechQuestion(q, optionPermutations[id]);
    });

    return {
      sessionId: session._id,
      courseSlug: session.courseSlug,
      mode: session.mode,
      topicId: session.topicId ?? null,
      status: timedOut ? ("in_progress" as const) : session.status,
      endsAt: session.endsAt ?? null,
      serverNow: now,
      timedOut,
      answers,
      questions,
      score: session.score ?? null,
      maxScore: session.maxScore ?? null,
      results: revealKeys && session.resultsJson ? JSON.parse(session.resultsJson) : null,
      startedAt: session.startedAt,
    };
  },
});

export const saveTechPracticeAnswer = mutation({
  args: {
    ...sessionArgs,
    sessionId: v.id("gigaLearnTechSessions"),
    questionId: v.string(),
    selectedIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== email) {
      throw new Error("Practice session not found.");
    }
    if (session.status !== "in_progress") {
      throw new Error("This practice session is already closed.");
    }

    const questionIds = parseIds(session.questionIdsJson);
    if (!questionIds.includes(args.questionId)) {
      throw new Error("Question is not part of this session.");
    }
    const bankQuestion = getTechBankQuestionById(session.courseSlug, args.questionId);
    const maxOptionIndex = Math.max(0, (bankQuestion?.options.length ?? 4) - 1);
    if (
      !Number.isInteger(args.selectedIndex) ||
      args.selectedIndex < 0 ||
      args.selectedIndex > maxOptionIndex
    ) {
      throw new Error("Invalid answer selection.");
    }

    const now = Date.now();
    const answers = parseAnswers(session.answersJson);
    // Idempotent overwrite — repeated saves do not award duplicate score points
    // (scoring runs once in finalizeSession / submit).
    answers[args.questionId] = args.selectedIndex;
    await ctx.db.patch(session._id, {
      answersJson: JSON.stringify(answers),
      updatedAt: now,
    });

    if (session.mode === "timed" && session.endsAt != null && now >= session.endsAt) {
      // Auto-grade on timeout — client cannot extend endsAt.
      const graded = await finalizeSession(
        ctx,
        { ...session, answersJson: JSON.stringify(answers) },
        now,
        "timer"
      );
      return { saved: true, feedback: null, autoSubmitted: graded };
    }

    // Learn + practice_test: immediate per-answer feedback (premium Full pack
    // and mode-picker Practice test). Timed exams still withhold until finish.
    if (session.mode === "learn" || session.mode === "practice_test") {
      const q = bankQuestion;
      const perm = parseOptionPermutations(session.optionPermutationsJson)[args.questionId];
      if (
        !q ||
        (q.reviewStatus !== "approved" && q.reviewStatus !== "pending_review")
      ) {
        return {
          saved: true,
          feedback: {
            correct: false,
            pendingReview: true,
            provisionalMatch: false,
            explanation:
              "Answer under review — this item has no verified answer key yet.",
            correctIndex: null as number | null,
          },
        };
      }
      const pendingReview = q.reviewStatus === "pending_review";
      const originalSelected = toOriginalOptionIndex(args.selectedIndex, perm);
      const matchedKey = originalSelected === q.correctIndex;
      const displayOrder = perm ?? q.options.map((_, i) => i);
      const displayCorrect = displayCorrectIndex(q.correctIndex, displayOrder);
      const optionExplanations =
        q.optionExplanations && q.optionExplanations.length === q.options.length
          ? displayOrder.map((original) => q.optionExplanations?.[original] ?? "")
          : undefined;
      const cleanExplanation = sanitizePracticeExplanation(q.explanation);
      const cleanOptionNotes = optionExplanations?.map((note) =>
        sanitizePracticeExplanation(note)
      );
      if (pendingReview) {
        // Practice may continue, but never claim a verified correct/incorrect result
        // or drive correctness-dependent praise from an unverified key.
        return {
          saved: true,
          feedback: {
            correct: false,
            pendingReview: true,
            provisionalMatch: matchedKey,
            explanation: matchedKey
              ? `Answer under review. Your choice matches the provisional key — this is not a human-verified result. ${cleanExplanation}`
              : `Answer under review. The provisional key differs from your choice — treat this feedback as non-authoritative. ${cleanExplanation}`,
            correctIndex: displayCorrect,
            optionExplanations: cleanOptionNotes,
          },
        };
      }
      return {
        saved: true,
        feedback: {
          correct: matchedKey,
          pendingReview: false,
          provisionalMatch: false,
          explanation: cleanExplanation,
          correctIndex: displayCorrect,
          optionExplanations: cleanOptionNotes,
        },
      };
    }

    return { saved: true, feedback: null };
  },
});

export const submitTechPracticeSession = mutation({
  args: {
    ...sessionArgs,
    sessionId: v.id("gigaLearnTechSessions"),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== email) {
      throw new Error("Practice session not found.");
    }
    if (session.status === "graded") {
      return {
        alreadyGraded: true,
        score: session.score,
        maxScore: session.maxScore,
        results: session.resultsJson ? JSON.parse(session.resultsJson) : [],
      };
    }
    return await finalizeSession(ctx, session, Date.now(), "submit");
  },
});

async function finalizeSession(
  ctx: { db: any },
  session: {
    _id: any;
    userId: string;
    courseSlug: string;
    questionIdsJson: string;
    answersJson: string;
    optionPermutationsJson?: string;
    mode: string;
    endsAt?: number;
  },
  now: number,
  reason: "submit" | "timer"
) {
  const questionIds = parseIds(session.questionIdsJson);
  const answers = parseAnswers(session.answersJson);
  const optionPermutations = parseOptionPermutations(session.optionPermutationsJson);
  const graded = gradeTechAnswers({
    courseSlug: session.courseSlug,
    questionIds,
    answers,
    optionPermutations,
  });

  await ctx.db.patch(session._id, {
    status: "graded",
    score: graded.score,
    maxScore: graded.maxScore,
    resultsJson: JSON.stringify(graded.results),
    submittedAt: now,
    updatedAt: now,
    answersJson: JSON.stringify(answers),
  });

  // Nudge Academy pathway progress from real activity (never invent %).
  const enrolment = await ctx.db
    .query("gigaLearnAcademyEnrolments")
    .withIndex("by_user_course", (q: any) =>
      q.eq("userId", session.userId).eq("courseSlug", session.courseSlug)
    )
    .first();
  if (enrolment && enrolment.status === "active") {
    const bankSize = getTechBankQuestions(session.courseSlug, { approvedOnly: true }).length;
    const prior = await ctx.db
      .query("gigaLearnTechSessions")
      .withIndex("by_user_course", (q: any) =>
        q.eq("userId", session.userId).eq("courseSlug", session.courseSlug)
      )
      .take(100);
    const attempted = new Set<string>();
    for (const s of prior) {
      for (const id of parseIds(s.questionIdsJson)) attempted.add(id);
    }
    for (const id of questionIds) attempted.add(id);
    const pct = bankSize
      ? Math.min(99, Math.round((attempted.size / bankSize) * 100))
      : enrolment.progressPercent;
    await ctx.db.patch(enrolment._id, {
      progressPercent: Math.max(enrolment.progressPercent ?? 0, pct),
      updatedAt: now,
    });
  }

  return {
    alreadyGraded: false,
    reason,
    score: graded.score,
    maxScore: graded.maxScore,
    percent: graded.percent,
    results: graded.results,
  };
}

/** Teacher/admin preview of topic questions (keys only for accepted admin/creator). */
export const previewTechTopicQuestions = query({
  args: {
    ...sessionArgs,
    courseSlug: v.string(),
    topicId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const email = await tryRequireSession(args.sessionToken, ctx);
    if (!email) return [];
    const invite = await ctx.db
      .query("adminInvites")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .first();
    const mayPreview = Boolean(
      invite &&
        invite.status === "accepted" &&
        (invite.role === "admin" || invite.role === "creator")
    );
    if (!mayPreview) {
      throw new Error("Teacher or admin access required to preview answer keys.");
    }
    const slug = normalizeSlug(args.courseSlug);
    const limit = Math.max(1, Math.min(50, args.limit ?? 20));
    const rows = getTechBankQuestions(slug, {
      approvedOnly: false,
      topicId: args.topicId.trim(),
    }).slice(0, limit);
    return rows.map((q) => ({
      questionId: q.questionId,
      questionText: q.questionText,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      reviewStatus: q.reviewStatus,
      sourceQuestionNumber: q.sourceQuestionNumber,
      tags: q.tags,
    }));
  },
});
