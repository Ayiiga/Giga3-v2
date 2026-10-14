/**
 * GigaLearn Academy Phase 3 — assessments & server-authoritative grading.
 * Reuses web/lib/gigalearn/questions.gradeAnswer and adaptiveLearning.markAnswer.
 * Does not mutate gigaLearnProgress or compete with PracticeSession school practice.
 */
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { requireSession, requireSessionWithMonitoring, tryRequireSession } from "./auth";
import { sessionArgs } from "./validators";
import {
  assessmentIsUnlocked,
  getBuiltinAssessment,
  gradeObjectiveSubmission,
  listBuiltinAssessmentsForCourse,
  toPublicAssessmentQuestions,
  unlockedModuleIds,
  type AcademyAssessmentDefinition,
} from "../web/lib/gigalearn/academy/assessmentCatalog";
import { getBuiltinAcademyCourse } from "../web/lib/gigalearn/academy/courseCatalog";

const SUBMIT_COOLDOWN_MS = 3000;
const MAX_ANSWER_CHARS = 4000;

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase().slice(0, 80);
}

async function requireActiveEnrolment(
  ctx: { db: any },
  email: string,
  courseSlug: string
) {
  const slug = normalizeSlug(courseSlug);
  const enrolment = await ctx.db
    .query("gigaLearnAcademyEnrolments")
    .withIndex("by_user_course", (q: any) => q.eq("userId", email).eq("courseSlug", slug))
    .first();
  if (!enrolment || enrolment.status === "withdrawn") {
    throw new Error("Enrolment required for Academy assessments.");
  }
  return { enrolment, slug };
}

async function userMayReview(ctx: { db: any }, email: string): Promise<boolean> {
  const invite = await ctx.db
    .query("adminInvites")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first();
  return Boolean(
    invite &&
      invite.status === "accepted" &&
      (invite.role === "admin" || invite.role === "creator")
  );
}

async function passedIdsForUser(
  ctx: { db: any },
  email: string,
  courseSlug: string
): Promise<Set<string>> {
  const rows = await ctx.db
    .query("gigaLearnAcademyAttempts")
    .withIndex("by_user_course", (q: any) => q.eq("userId", email).eq("courseSlug", courseSlug))
    .take(200);
  const passed = new Set<string>();
  for (const row of rows) {
    if (row.passed && (row.status === "graded" || row.status === "submitted")) {
      passed.add(row.assessmentId);
    }
  }
  return passed;
}

async function attemptCount(
  ctx: { db: any },
  email: string,
  assessmentId: string
): Promise<number> {
  const rows = await ctx.db
    .query("gigaLearnAcademyAttempts")
    .withIndex("by_user_assessment", (q: any) =>
      q.eq("userId", email).eq("assessmentId", assessmentId)
    )
    .take(50);
  return rows.filter((r: { status: string }) => r.status !== "in_progress").length;
}

function parseAnswersJson(raw: string): Record<string, string | string[]> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string | string[]> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v.slice(0, MAX_ANSWER_CHARS);
      else if (Array.isArray(v))
        out[k] = v.map((x) => String(x).slice(0, 500)).slice(0, 20);
    }
    return out;
  } catch {
    return {};
  }
}

function revisionHintFor(assessment: AcademyAssessmentDefinition, score: number): string {
  if (score >= assessment.passThreshold) {
    return assessment.gatesModuleId
      ? `You passed. The next gated module (${assessment.gatesModuleId}) is now available on your pathway.`
      : "You passed this checkpoint. Continue the pathway lessons or ask the AI Tutor for enrichment.";
  }
  return `Score below ${assessment.passThreshold}%. Revise the related Academy lesson/module, use AI Tutor practice, then retry (attempts remaining may apply).`;
}

export const listCourseAssessments = query({
  args: {
    ...sessionArgs,
    courseSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const { slug } = await requireActiveEnrolment(ctx, email, args.courseSlug);
    const defs = listBuiltinAssessmentsForCourse(slug);
    const passed = await passedIdsForUser(ctx, email, slug);
    const course = getBuiltinAcademyCourse(slug);
    const moduleIds = course?.modules.map((m) => m.id) ?? [];
    const unlocked = new Set(unlockedModuleIds(moduleIds, defs, passed));

    const out = [];
    for (const a of defs) {
      const attemptsUsed = await attemptCount(ctx, email, a.id);
      const unlockedByPrereq = assessmentIsUnlocked(a, passed);
      const moduleOk = !a.moduleId || unlocked.has(a.moduleId) || !defs.some((d) => d.gatesModuleId === a.moduleId);
      // First module assessments are always available when prereqs pass.
      const available = unlockedByPrereq && (moduleOk || !a.requiresPassedAssessmentIds.length);
      out.push({
        id: a.id,
        title: a.title,
        description: a.description,
        kind: a.kind,
        moduleId: a.moduleId,
        lessonId: a.lessonId,
        passThreshold: a.passThreshold,
        maxAttempts: a.maxAttempts,
        gradingMode: a.gradingMode,
        protectedFinal: a.protectedFinal,
        questionCount: a.questions.length,
        attemptsUsed,
        attemptsRemaining: Math.max(0, a.maxAttempts - attemptsUsed),
        passed: passed.has(a.id),
        unlocked: available,
        requiresPassedAssessmentIds: a.requiresPassedAssessmentIds,
        gatesModuleId: a.gatesModuleId,
      });
    }
    return {
      courseSlug: slug,
      unlockedModuleIds: [...unlocked],
      assessments: out,
    };
  },
});

export const getAssessmentAttemptView = query({
  args: {
    ...sessionArgs,
    courseSlug: v.string(),
    assessmentId: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const { slug } = await requireActiveEnrolment(ctx, email, args.courseSlug);
    const assessment = getBuiltinAssessment(slug, args.assessmentId);
    if (!assessment) return null;

    const passed = await passedIdsForUser(ctx, email, slug);
    const unlocked = assessmentIsUnlocked(assessment, passed);
    const attemptsUsed = await attemptCount(ctx, email, assessment.id);

    return {
      id: assessment.id,
      courseSlug: assessment.courseSlug,
      title: assessment.title,
      description: assessment.description,
      kind: assessment.kind,
      moduleId: assessment.moduleId,
      lessonId: assessment.lessonId,
      passThreshold: assessment.passThreshold,
      maxAttempts: assessment.maxAttempts,
      gradingMode: assessment.gradingMode,
      protectedFinal: assessment.protectedFinal,
      requiresPassedAssessmentIds: assessment.requiresPassedAssessmentIds,
      unlocked,
      passed: passed.has(assessment.id),
      attemptsUsed,
      attemptsRemaining: Math.max(0, assessment.maxAttempts - attemptsUsed),
      // Never send keys before grading.
      questions: toPublicAssessmentQuestions(assessment.questions, {
        includeKeys: false,
        protectedFinal: assessment.protectedFinal,
      }),
    };
  },
});

export const listMyAssessmentHistory = query({
  args: {
    ...sessionArgs,
    courseSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const slug = args.courseSlug ? normalizeSlug(args.courseSlug) : null;
    const rows = slug
      ? await ctx.db
          .query("gigaLearnAcademyAttempts")
          .withIndex("by_user_course", (q) => q.eq("userId", email).eq("courseSlug", slug))
          .take(100)
      : await ctx.db
          .query("gigaLearnAcademyAttempts")
          .withIndex("by_user", (q) => q.eq("userId", email))
          .take(100);

    return rows
      .filter((r) => r.status !== "in_progress")
      .sort((a, b) => (b.submittedAt ?? b.updatedAt) - (a.submittedAt ?? a.updatedAt))
      .map((r) => ({
        id: r._id,
        courseSlug: r.courseSlug,
        assessmentId: r.assessmentId,
        attemptNumber: r.attemptNumber,
        status: r.status,
        score: r.score,
        passed: r.passed,
        gradingMode: r.gradingMode,
        gradedBy: r.gradedBy,
        feedbackSummary: r.feedbackSummary,
        revisionHint: r.revisionHint,
        submittedAt: r.submittedAt,
        gradedAt: r.gradedAt,
        // Do not return answersJson / results with keys to list views.
      }));
  },
});

export const getCourseProgression = query({
  args: {
    ...sessionArgs,
    courseSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const { slug } = await requireActiveEnrolment(ctx, email, args.courseSlug);
    const course = getBuiltinAcademyCourse(slug);
    const defs = listBuiltinAssessmentsForCourse(slug);
    const passed = await passedIdsForUser(ctx, email, slug);
    const moduleIds = course?.modules.map((m) => m.id) ?? [];
    return {
      courseSlug: slug,
      passedAssessmentIds: [...passed],
      unlockedModuleIds: unlockedModuleIds(moduleIds, defs, passed),
      allModuleIds: moduleIds,
    };
  },
});

/**
 * Submit + grade an assessment. Scores are computed server-side only.
 * Client must not send score/passed fields (validator omits them).
 */
export const submitAssessmentAttempt = mutation({
  args: {
    ...sessionArgs,
    courseSlug: v.string(),
    assessmentId: v.string(),
    answersJson: v.string(),
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const { slug } = await requireActiveEnrolment(ctx, email, args.courseSlug);
    const assessment = getBuiltinAssessment(slug, args.assessmentId);
    if (!assessment) throw new Error("Assessment not found.");

    const key = args.idempotencyKey.trim().slice(0, 120);
    if (key.length < 8) throw new Error("Invalid idempotency key.");

    const existing = await ctx.db
      .query("gigaLearnAcademyAttempts")
      .withIndex("by_idempotency", (q) =>
        q.eq("userId", email).eq("assessmentId", assessment.id).eq("idempotencyKey", key)
      )
      .first();
    if (existing) {
      return {
        attemptId: existing._id,
        duplicate: true as const,
        status: existing.status,
        score: existing.score,
        passed: existing.passed,
        feedbackSummary: existing.feedbackSummary,
        revisionHint: existing.revisionHint,
        results: existing.resultsJson ? JSON.parse(existing.resultsJson) : [],
        protectedFinal: assessment.protectedFinal,
      };
    }

    const passedSet = await passedIdsForUser(ctx, email, slug);
    if (!assessmentIsUnlocked(assessment, passedSet)) {
      throw new Error("Pass the required earlier assessments before attempting this one.");
    }

    const used = await attemptCount(ctx, email, assessment.id);
    if (used >= assessment.maxAttempts) {
      throw new Error("No attempts remaining for this assessment.");
    }

    const recent = await ctx.db
      .query("gigaLearnAcademyAttempts")
      .withIndex("by_user_assessment", (q) =>
        q.eq("userId", email).eq("assessmentId", assessment.id)
      )
      .take(5);
    const lastSubmit = recent
      .map((r: { submittedAt?: number }) => r.submittedAt ?? 0)
      .reduce((a: number, b: number) => Math.max(a, b), 0);
    if (lastSubmit && Date.now() - lastSubmit < SUBMIT_COOLDOWN_MS) {
      throw new Error("Please wait a moment before submitting again.");
    }

    if (args.answersJson.length > 80_000) throw new Error("Submission too large.");
    const answers = parseAnswersJson(args.answersJson);
    const now = Date.now();

    if (assessment.gradingMode === "instructor_review") {
      const attemptId = await ctx.db.insert("gigaLearnAcademyAttempts", {
        userId: email,
        courseSlug: slug,
        assessmentId: assessment.id,
        attemptNumber: used + 1,
        status: "pending_review",
        answersJson: JSON.stringify(answers),
        gradingMode: assessment.gradingMode,
        idempotencyKey: key,
        startedAt: now,
        submittedAt: now,
        updatedAt: now,
        feedbackSummary: "Submitted for instructor review. This is not an official AI grade.",
        revisionHint: "Await instructor feedback. You may continue learning with the AI Tutor meanwhile.",
      });
      return {
        attemptId,
        duplicate: false as const,
        status: "pending_review" as const,
        score: null,
        passed: false,
        feedbackSummary: "Submitted for instructor review.",
        revisionHint: "Await instructor feedback.",
        results: [],
        protectedFinal: assessment.protectedFinal,
        needsAiAssist: false,
      };
    }

    const graded = gradeObjectiveSubmission(assessment, answers);
    const needsAi =
      assessment.gradingMode === "ai_assisted" && graded.subjectiveQuestionIds.length > 0;

    const status = needsAi ? ("submitted" as const) : ("graded" as const);
    const feedbackSummary = needsAi
      ? `Objective portion scored ${graded.score}%. Short answers need AI-assisted feedback (separate step) — not an official certificate grade.`
      : graded.passed
        ? `Passed with ${graded.score}%.`
        : `Scored ${graded.score}%. Pass mark is ${assessment.passThreshold}%.`;

    const publicResults = graded.results.map((r) => ({
      questionId: r.questionId,
      correct: r.correct,
      pointsEarned: r.pointsEarned,
      pointsPossible: r.pointsPossible,
      explanation: assessment.protectedFinal ? undefined : r.explanation,
      // Never echo keys for protected finals.
      normalizedCorrect: assessment.protectedFinal ? undefined : r.normalizedCorrect,
    }));

    const attemptId = await ctx.db.insert("gigaLearnAcademyAttempts", {
      userId: email,
      courseSlug: slug,
      assessmentId: assessment.id,
      attemptNumber: used + 1,
      status,
      answersJson: JSON.stringify(answers),
      score: graded.score,
      maxScore: graded.maxScore,
      passed: needsAi ? false : graded.passed,
      resultsJson: JSON.stringify(publicResults),
      feedbackSummary,
      revisionHint: revisionHintFor(assessment, graded.score),
      gradingMode: assessment.gradingMode,
      gradedBy: needsAi ? "mixed" : "objective",
      idempotencyKey: key,
      startedAt: now,
      submittedAt: now,
      gradedAt: needsAi ? undefined : now,
      updatedAt: now,
    });

    return {
      attemptId,
      duplicate: false as const,
      status,
      score: graded.score,
      passed: needsAi ? false : graded.passed,
      feedbackSummary,
      revisionHint: revisionHintFor(assessment, graded.score),
      results: publicResults,
      protectedFinal: assessment.protectedFinal,
      needsAiAssist: needsAi,
      subjectiveQuestionIds: graded.subjectiveQuestionIds,
    };
  },
});

/** AI-assisted feedback for short answers — reuses adaptiveLearning.markAnswer. */
export const runAiAssistedAssessmentFeedback = action({
  args: {
    sessionToken: v.string(),
    courseSlug: v.string(),
    assessmentId: v.string(),
    attemptId: v.id("gigaLearnAcademyAttempts"),
  },
  handler: async (ctx, args) => {
    const email = await requireSessionWithMonitoring(args.sessionToken, ctx);
    const slug = normalizeSlug(args.courseSlug);
    const assessment = getBuiltinAssessment(slug, args.assessmentId);
    if (!assessment) throw new Error("Assessment not found.");
    if (assessment.gradingMode !== "ai_assisted") {
      throw new Error("This assessment does not use AI-assisted grading.");
    }

    const attempt = await ctx.runQuery(api.gigaLearnAcademyAssessments.getAttemptInternalView, {
      sessionToken: args.sessionToken,
      attemptId: args.attemptId,
    });
    if (!attempt || attempt.userId !== email) {
      throw new Error("Attempt not found.");
    }
    if (attempt.courseSlug !== slug || attempt.assessmentId !== assessment.id) {
      throw new Error("Attempt does not match assessment.");
    }

    const answers = parseAnswersJson(attempt.answersJson);
    const aiNotes: string[] = [];
    for (const q of assessment.questions) {
      if (q.type !== "short_answer") continue;
      const studentAnswer = typeof answers[q.id] === "string" ? (answers[q.id] as string) : "";
      if (!studentAnswer.trim()) {
        aiNotes.push(`${q.id}: No response.`);
        continue;
      }
      try {
        const marked = await ctx.runAction(api.adaptiveLearning.markAnswer, {
          sessionToken: args.sessionToken,
          question: q.stem,
          studentAnswer,
          correctAnswer: q.correctAnswer
            ? Array.isArray(q.correctAnswer)
              ? q.correctAnswer.join("; ")
              : q.correctAnswer
            : undefined,
          markingGuide:
            "Academy AI-assisted feedback only. Do not claim official exam grading authority.",
          maxScore: (q.points ?? 1) * 20,
          context: {
            subject: assessment.courseSlug,
            topic: assessment.title,
            learningObjective: q.learningObjective,
          },
        });
        aiNotes.push(
          `${q.id}: AI assist score ${marked.verdict?.score ?? "n/a"} — ${
            marked.verdict?.explanation ?? marked.feedback.slice(0, 400)
          }`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI grading failed";
        aiNotes.push(`${q.id}: AI feedback unavailable (${msg}).`);
      }
    }

    const finalized = await ctx.runMutation(
      api.gigaLearnAcademyAssessments.finalizeAiAssistedAttempt,
      {
        sessionToken: args.sessionToken,
        attemptId: args.attemptId,
        aiFeedbackSummary: aiNotes.join("\n").slice(0, 4000),
      }
    );
    return finalized;
  },
});

/** Authenticated read of own attempt payload for AI assist action. */
export const getAttemptInternalView = query({
  args: {
    ...sessionArgs,
    attemptId: v.id("gigaLearnAcademyAttempts"),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt || attempt.userId !== email) return null;
    return {
      userId: attempt.userId,
      courseSlug: attempt.courseSlug,
      assessmentId: attempt.assessmentId,
      answersJson: attempt.answersJson,
      status: attempt.status,
      score: attempt.score,
    };
  },
});

export const finalizeAiAssistedAttempt = mutation({
  args: {
    ...sessionArgs,
    attemptId: v.id("gigaLearnAcademyAttempts"),
    aiFeedbackSummary: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt || attempt.userId !== email) throw new Error("Attempt not found.");
    const assessment = getBuiltinAssessment(attempt.courseSlug, attempt.assessmentId);
    if (!assessment) throw new Error("Assessment not found.");

    const score = attempt.score ?? 0;
    const passed = score >= assessment.passThreshold;
    const now = Date.now();
    const feedbackSummary = [
      attempt.feedbackSummary ?? "",
      "AI-assisted comments (not an official certificate grade):",
      args.aiFeedbackSummary.trim().slice(0, 4000),
    ]
      .filter(Boolean)
      .join("\n");

    await ctx.db.patch(attempt._id, {
      status: "graded",
      passed,
      gradedBy: "mixed",
      feedbackSummary: feedbackSummary.slice(0, 4500),
      revisionHint: revisionHintFor(assessment, score),
      gradedAt: now,
      updatedAt: now,
    });

    return {
      attemptId: attempt._id,
      status: "graded" as const,
      score,
      passed,
      feedbackSummary: feedbackSummary.slice(0, 1500),
      revisionHint: revisionHintFor(assessment, score),
      protectedFinal: assessment.protectedFinal,
    };
  },
});

export const instructorReviewAttempt = mutation({
  args: {
    ...sessionArgs,
    attemptId: v.id("gigaLearnAcademyAttempts"),
    score: v.number(),
    passed: v.boolean(),
    reviewNotes: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const allowed = await userMayReview(ctx, email);
    if (!allowed) throw new Error("Not authorized to review Academy assessments.");

    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) throw new Error("Attempt not found.");
    if (attempt.status !== "pending_review" && attempt.gradingMode !== "instructor_review") {
      throw new Error("Attempt is not awaiting instructor review.");
    }

    const score = Math.max(0, Math.min(100, Math.round(args.score)));
    const now = Date.now();
    await ctx.db.patch(attempt._id, {
      status: "graded",
      score,
      maxScore: 100,
      passed: args.passed,
      gradedBy: "instructor",
      reviewerUserId: email,
      reviewNotes: args.reviewNotes.trim().slice(0, 4000),
      feedbackSummary: `Instructor review: ${args.reviewNotes.trim().slice(0, 500)}`,
      gradedAt: now,
      updatedAt: now,
    });
    return { ok: true as const, attemptId: attempt._id, score, passed: args.passed };
  },
});

/** Soft probe for UI — does not leak other learners. */
export const canReviewAssessments = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await tryRequireSession(args.sessionToken, ctx);
    if (!email) return { allowed: false as const };
    return { allowed: await userMayReview(ctx, email) };
  },
});
