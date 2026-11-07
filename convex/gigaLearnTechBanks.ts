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
  isFreeProgressiveExamCourseSlug,
  EXAM_PRACTICE_FREE_JOURNEY_PASS_PERCENT,
  EXAM_PRACTICE_FREE_JOURNEY_STAGE_SIZE,
  EXAM_PRACTICE_FREE_JOURNEY_TOTAL,
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

type FreeExamJourneyEntry = {
  stage: number;
  currentQuestionIds: string[];
  completedQuestionIds: string[];
  lastPercent?: number;
};
type FreeExamJourneyState = Record<string, FreeExamJourneyEntry>;

function parseFreeExamJourney(raw?: string): FreeExamJourneyState {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return value as FreeExamJourneyState;
  } catch {
    return {};
  }
}

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase().slice(0, 80);
}

function parseAnswers(raw: string): Record<string, number | string> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, number | string> = {};
    for (const [k, val] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof val === "number" && Number.isInteger(val) && val >= 0 && val <= 3) {
        out[k.slice(0, 120)] = val;
      } else if (typeof val === "string" && val.length <= 5000) {
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
    /** Optional: "mcq" | "true_false" | "structured" — type-specific practice when the bank has that format. */
    questionType: v.optional(v.union(v.literal("mcq"), v.literal("true_false"), v.literal("structured"))),
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
    // Every entry mode must use the same server-controlled free journey.
    // This prevents topic/random/revision/challenge selectors bypassing the 60% gate.
    const progressiveFreeJourney = isFreeProgressiveExamCourseSlug(slug);
    // BECE/WASSCE are free for every learner, including paid subscribers.
    // Paid entitlements never bypass the staged 50-question progression.
    const premiumAccess = progressiveFreeJourney
      ? false
      : hasExamPracticePremiumAccess({
          subscriptionActive,
          hasPurchasedCredits,
          credits: user?.credits ?? 0,
          examPracticePremiumExpiresAt: user?.examPracticePremiumExpiresAt,
        });
    // Match the selector's exam-bank policy: approved items plus published
    // pending-review items with explicitly provisional, non-scored feedback.
    // Do not size the session from approved-only counts; promotion banks are
    // awaiting human verification and would otherwise appear empty.
    const selectedTopicId = args.topicId?.trim() || undefined;
    const bankSize = getTechBankQuestions(slug, {
      approvedOnly: true,
      topicId: selectedTopicId,
      freeTierOnly: !premiumAccess,
      questionType,
    }).length;
    if (progressiveFreeJourney && bankSize === 0 && meta.pendingQuestionCount > 0) {
      throw new Error(
        "This WASSCE question bank is awaiting answer-key verification. Free staged practice will open as soon as its questions are approved."
      );
    }
    if (questionType && bankSize === 0) {
      throw new Error(
        questionType === "true_false"
          ? "True/False practice is not yet available for this rank. Multiple-choice items may still be available."
          : questionType === "structured"
            ? "Structured-response practice is not yet available for this selection."
            : "Multiple-choice practice is not yet available for this selection."
      );
    }
    const resolved = resolveExamPracticeSessionCount({
      requested: progressiveFreeJourney
        ? EXAM_PRACTICE_FREE_JOURNEY_STAGE_SIZE
        : args.count ?? defaultCount,
      courseSlug: slug,
      bankSize,
      subscriptionActive: progressiveFreeJourney ? false : subscriptionActive,
      hasPurchasedCredits: progressiveFreeJourney ? false : hasPurchasedCredits,
      // Residual balance must not unlock — pass through only for API clarity.
      credits: user?.credits ?? 0,
      examPracticePremiumExpiresAt: progressiveFreeJourney
        ? undefined
        : user?.examPracticePremiumExpiresAt,
    });
    const count = resolved.count;
    const seed = Date.now() ^ Math.floor(Math.random() * 1e9);
    let questionIds: string[];
    let journeyStage: number | null = null;
    let journeyQuestionLimit: number | null = null;
    // Keep progressive journeys separate for each selected BECE subject.
    // A learner selecting Asante Twi must never resume a mixed-subject stage.
    const topicKey = selectedTopicId ?? "all";
    const journeyKey = `${slug}:${topicKey}`;
    if (progressiveFreeJourney) {
      if (!user) throw new Error("Learner account not found.");
      const journey = parseFreeExamJourney(user.examPracticeJourneyJson);
      const current = journey[journeyKey] ?? {
        stage: 0,
        currentQuestionIds: [],
        completedQuestionIds: [],
      };
      const completed = new Set(current.completedQuestionIds);
      const candidates = getTechBankQuestions(slug, {
        approvedOnly: true,
        topicId: selectedTopicId,
        freeTierOnly: true,
        questionType,
      }).filter((q) => !completed.has(q.questionId));
      const remainingAllowance = Math.max(
        0,
        EXAM_PRACTICE_FREE_JOURNEY_TOTAL - current.completedQuestionIds.length
      );
      journeyQuestionLimit = Math.min(
        EXAM_PRACTICE_FREE_JOURNEY_TOTAL,
        current.completedQuestionIds.length + candidates.length
      );
      let stageIds = current.currentQuestionIds.filter((id) =>
        candidates.some((q) => q.questionId === id)
      );
      if (stageIds.length === 0) {
        if (remainingAllowance <= 0 || candidates.length === 0) {
          throw new Error("You have completed all currently available free questions in this practice bank.");
        }
        const pool = candidates.slice(0, remainingAllowance).map((q) => q.questionId);
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        stageIds = pool.slice(0, Math.min(EXAM_PRACTICE_FREE_JOURNEY_STAGE_SIZE, remainingAllowance));
        journey[journeyKey] = {
          ...current,
          currentQuestionIds: stageIds,
        };
        await ctx.db.patch(user._id, { examPracticeJourneyJson: JSON.stringify(journey) });
      }
      questionIds = stageIds;
      journeyStage = current.stage + 1;
    } else {
      questionIds = selectTechQuestionIds({
        courseSlug: slug,
        mode,
        topicId: args.topicId?.trim() || undefined,
        count,
        seed,
        revisionQuestionIds: revisionIds,
        premiumAccess: resolved.premiumAccess,
        questionType,
      });
    }
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
      journey: progressiveFreeJourney
        ? {
            stage: journeyStage,
            stageSize: questionIds.length,
            totalQuestionLimit: journeyQuestionLimit,
            passPercent: EXAM_PRACTICE_FREE_JOURNEY_PASS_PERCENT,
            stagesTarget: Math.ceil((journeyQuestionLimit ?? 0) / EXAM_PRACTICE_FREE_JOURNEY_STAGE_SIZE),
          }
        : null,
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
    selectedIndex: v.optional(v.number()),
    textAnswer: v.optional(v.string()),
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
    if (!bankQuestion) throw new Error("Question is unavailable.");
    let answerValue: number | string;
    if (bankQuestion.questionType === "structured") {
      if (typeof args.textAnswer !== "string") throw new Error("Enter a written response.");
      const textAnswer = args.textAnswer.trim();
      if (textAnswer.length < 2 || textAnswer.length > 5000) {
        throw new Error("Written responses must contain 2–5,000 characters.");
      }
      answerValue = textAnswer;
    } else {
      const maxOptionIndex = Math.max(0, bankQuestion.options.length - 1);
      if (
        typeof args.selectedIndex !== "number" ||
        !Number.isInteger(args.selectedIndex) ||
        args.selectedIndex < 0 ||
        args.selectedIndex > maxOptionIndex
      ) throw new Error("Invalid answer selection.");
      answerValue = args.selectedIndex;
    }

    const now = Date.now();
    const answers = parseAnswers(session.answersJson);
    // Idempotent overwrite — repeated saves do not award duplicate score points.
    answers[args.questionId] = answerValue;
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

    if (bankQuestion.questionType === "structured") {
      return {
        saved: true,
        feedback: {
          correct: false,
          pendingReview: false,
          selfAssessment: true,
          provisionalMatch: false,
          explanation: "Written response saved. It will not be automatically scored. Submit the session to reveal the self-assessment marking points.",
          correctIndex: null as number | null,
        },
      };
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
              ? `Your choice matches the provisional key, but the key has not been human-verified. ${cleanExplanation}`
              : `The provisional key differs from your choice, but it has not been human-verified. Treat this guidance as non-authoritative. ${cleanExplanation}`,
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
        percent:
          session.maxScore && session.maxScore > 0
            ? Math.round(((session.score ?? 0) / session.maxScore) * 100)
            : 0,
        results: session.resultsJson ? JSON.parse(session.resultsJson) : [],
        rewardXp: session.rewardXp ?? 0,
        rewardLabel: session.rewardLabel ?? null,
        totalXp: undefined as number | undefined,
        sessionsCompleted: undefined as number | undefined,
      };
    }
    return await finalizeSession(ctx, session, Date.now(), "submit");
  },
});

/** Non-monetary practice XP — never wallet/credits. Idempotent per session. */
function computePracticeReward(args: {
  score: number;
  maxScore: number;
  percent: number;
  questionCount: number;
}): { xp: number; label: string } {
  const base = Math.max(5, Math.min(40, args.questionCount));
  const accuracyBonus = Math.round((args.percent / 100) * base);
  const xp = base + accuracyBonus;
  let label = "Practice complete — keep building your streak.";
  if (args.percent >= 90) label = "Outstanding session — mastery XP earned.";
  else if (args.percent >= 75) label = "Strong session — progress XP earned.";
  else if (args.percent >= 50) label = "Solid effort — practice XP earned.";
  else label = "Session logged — review misses to earn more next time.";
  return { xp, label };
}

async function finalizeSession(
  ctx: { db: any },
  session: {
    _id: any;
    userId: string;
    courseSlug: string;
    topicId?: string;
    questionIdsJson: string;
    answersJson: string;
    optionPermutationsJson?: string;
    mode: string;
    endsAt?: number;
    rewardXp?: number;
    rewardLabel?: string;
    rewardGrantedAt?: number;
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
  let freeJourneyResult: {
    passed: boolean;
    nextStage: number;
    completedQuestions: number;
    totalQuestionLimit: number;
    passPercent: number;
  } | null = null;

  // Advance the free BECE/WASSCE journey only from the server-graded score.
  // Exactly 60% passes; retries retain the same stage question set.
  if (isFreeProgressiveExamCourseSlug(session.courseSlug)) {
    const learner = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", session.userId))
      .first();
    if (learner) {
      const journey = parseFreeExamJourney(learner.examPracticeJourneyJson);
      const key = `${session.courseSlug}:all`;
      const current = journey[key];
      const sessionIdsMatch = Boolean(
        current &&
          current.currentQuestionIds.length === questionIds.length &&
          questionIds.every((id) => current.currentQuestionIds.includes(id))
      );
      if (current && current.currentQuestionIds.length > 0 && sessionIdsMatch) {
        const passed = graded.percent >= EXAM_PRACTICE_FREE_JOURNEY_PASS_PERCENT;
        if (passed) {
          const completed = new Set(current.completedQuestionIds);
          for (const id of questionIds) completed.add(id);
          journey[key] = {
            stage: current.stage + 1,
            currentQuestionIds: [],
            completedQuestionIds: [...completed].slice(0, EXAM_PRACTICE_FREE_JOURNEY_TOTAL),
            lastPercent: graded.percent,
          };
        } else {
          journey[key] = { ...current, lastPercent: graded.percent };
        }
        const completedQuestions = journey[key].completedQuestionIds.length;
        const availableQuestionCount = getTechBankQuestions(session.courseSlug, {
          approvedOnly: true,
          freeTierOnly: true,
        }).length;
        freeJourneyResult = {
          passed,
          nextStage: journey[key].stage + 1,
          completedQuestions,
          totalQuestionLimit: Math.min(
            EXAM_PRACTICE_FREE_JOURNEY_TOTAL,
            availableQuestionCount
          ),
          passPercent: EXAM_PRACTICE_FREE_JOURNEY_PASS_PERCENT,
        };
        await ctx.db.patch(learner._id, {
          examPracticeJourneyJson: JSON.stringify(journey),
        });
      }
    }
  }

  // Grant XP once — retries / already-graded path must not farm rewards.
  let rewardXp = session.rewardXp ?? 0;
  let rewardLabel = session.rewardLabel ?? null;
  let totalXp: number | undefined;
  let sessionsCompleted: number | undefined;

  if (session.rewardGrantedAt == null) {
    const reward = computePracticeReward({
      score: graded.score,
      maxScore: graded.maxScore,
      percent: graded.percent,
      questionCount: questionIds.length,
    });
    rewardXp = reward.xp;
    rewardLabel = reward.label;

    const stats = await ctx.db
      .query("gigaLearnPracticeStats")
      .withIndex("by_user_course", (q: any) =>
        q.eq("userId", session.userId).eq("courseSlug", session.courseSlug)
      )
      .first();
    if (stats) {
      totalXp = (stats.totalXp ?? 0) + rewardXp;
      sessionsCompleted = (stats.sessionsCompleted ?? 0) + 1;
      await ctx.db.patch(stats._id, {
        totalXp,
        sessionsCompleted,
        questionsAttempted: (stats.questionsAttempted ?? 0) + questionIds.length,
        correctAnswers: (stats.correctAnswers ?? 0) + graded.score,
        bestPercent: Math.max(stats.bestPercent ?? 0, graded.percent),
        lastRewardLabel: rewardLabel,
        updatedAt: now,
      });
    } else {
      totalXp = rewardXp;
      sessionsCompleted = 1;
      await ctx.db.insert("gigaLearnPracticeStats", {
        userId: session.userId,
        courseSlug: session.courseSlug,
        totalXp,
        sessionsCompleted,
        questionsAttempted: questionIds.length,
        correctAnswers: graded.score,
        bestPercent: graded.percent,
        lastRewardLabel: rewardLabel,
        updatedAt: now,
      });
    }
  }

  await ctx.db.patch(session._id, {
    status: "graded",
    score: graded.score,
    maxScore: graded.maxScore,
    resultsJson: JSON.stringify(graded.results),
    submittedAt: now,
    updatedAt: now,
    answersJson: JSON.stringify(answers),
    rewardXp,
    rewardLabel: rewardLabel ?? undefined,
    rewardGrantedAt: session.rewardGrantedAt ?? now,
  });

  // Nudge Academy pathway progress from real activity (never invent %).
  const enrolment = await ctx.db
    .query("gigaLearnAcademyEnrolments")
    .withIndex("by_user_course", (q: any) =>
      q.eq("userId", session.userId).eq("courseSlug", session.courseSlug)
    )
    .first();
  if (enrolment && enrolment.status === "active") {
    const bankSize = getTechBankQuestions(session.courseSlug, {
      includePending: true,
    }).length;
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
    rewardXp,
    rewardLabel,
    totalXp,
    sessionsCompleted,
    journey: freeJourneyResult,
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
