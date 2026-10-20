/**
 * GigaLearn learner engagement — measurable counters + next-step actions.
 * Uses existing platformCounters + userActivityDaily (no schema change).
 * Presentation-agnostic: no visual redesign.
 */
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireSession, tryRequireSession } from "./auth";
import { sessionArgs } from "./validators";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";
import { todayKey } from "./creditsConfig";
import { getBuiltinAcademyCourse } from "../web/lib/gigalearn/academy/courseCatalog";
import {
  assessmentIsUnlocked,
  getBuiltinAssessment,
  listBuiltinAssessmentsForCourse,
} from "../web/lib/gigalearn/academy/assessmentCatalog";

/** Allowlisted client/server event names → platformCounters keys. */
export const GIGALEARN_ENGAGEMENT_EVENTS = {
  exam_centre_open: "gigalearn.exam_centre_open",
  academy_home_open: "gigalearn.academy_home_open",
  assess_hub_open: "gigalearn.assess_hub_open",
  resume_course_click: "gigalearn.resume_course_click",
  teacher_hub_from_exam: "gigalearn.teacher_hub_from_exam",
  student_learn_from_exam: "gigalearn.student_learn_from_exam",
  enrol: "gigalearn.enrolments",
  assessment_submit: "gigalearn.assessment_submits",
  pathway_update: "gigalearn.pathway_updates",
} as const;

export type GigaLearnEngagementEvent = keyof typeof GIGALEARN_ENGAGEMENT_EVENTS;

const CLIENT_EVENTS = new Set<GigaLearnEngagementEvent>([
  "exam_centre_open",
  "academy_home_open",
  "assess_hub_open",
  "resume_course_click",
  "teacher_hub_from_exam",
  "student_learn_from_exam",
]);

const MAX_CLIENT_EVENTS_PER_USER_DAY = 40;

async function bumpPlatformCounter(
  ctx: { db: any },
  key: string,
  amount = 1
): Promise<void> {
  const row = await ctx.db
    .query("platformCounters")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();
  const now = Date.now();
  if (row) {
    await ctx.db.patch(row._id, { value: row.value + amount, updatedAt: now });
    return;
  }
  await ctx.db.insert("platformCounters", { key, value: amount, updatedAt: now });
}

async function readPlatformCounter(ctx: { db: any }, key: string): Promise<number> {
  const row = await ctx.db
    .query("platformCounters")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();
  return row?.value ?? 0;
}

/** Internal bump used from Academy mutations (no session re-check). */
export const bumpLearnerEventInternal = internalMutation({
  args: {
    userId: v.string(),
    event: v.string(),
  },
  handler: async (ctx, args) => {
    const event = args.event as GigaLearnEngagementEvent;
    const key = GIGALEARN_ENGAGEMENT_EVENTS[event];
    if (!key) return { ok: false as const };
    await bumpPlatformCounter(ctx, key);
    await ctx.runMutation(internal.platformStatsRecorder.recordUserActivityInternal, {
      userId: args.userId,
    });
    return { ok: true as const };
  },
});

/**
 * Session-scoped client engagement signal (CTA opens / navigation intents).
 * Rate-limited per user per UTC day. Does not invent scores.
 */
export const recordLearnerEvent = mutation({
  args: {
    ...sessionArgs,
    event: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await tryRequireSession(args.sessionToken, ctx);
    if (!email) return { ok: false as const, reason: "unauthorized" as const };
    const event = args.event.trim() as GigaLearnEngagementEvent;
    if (!CLIENT_EVENTS.has(event)) {
      throw new Error("Unsupported learner engagement event.");
    }
    const dateKey = todayKey();
    const rlKey = `gigalearn.rl:${dateKey}:${email.slice(0, 80)}`;
    const used = await readPlatformCounter(ctx, rlKey);
    if (used >= MAX_CLIENT_EVENTS_PER_USER_DAY) {
      return { ok: false as const, reason: "rate_limited" as const };
    }
    await bumpPlatformCounter(ctx, rlKey);
    await bumpPlatformCounter(ctx, GIGALEARN_ENGAGEMENT_EVENTS[event]);
    await ctx.runMutation(internal.platformStatsRecorder.recordUserActivityInternal, {
      userId: email,
    });
    return { ok: true as const };
  },
});

/**
 * Personal next steps from server-verified enrolments, assessments, and practice.
 */
export const listMyNextSteps = query({
  args: {
    ...sessionArgs,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Soft-fail invalid/expired tokens so LearnerNextSteps useQuery cannot crash.
    const email = await tryRequireSession(args.sessionToken, ctx);
    if (!email) {
      return { steps: [], activeEnrolments: 0, generatedAt: Date.now() };
    }
    const cap = Math.min(args.limit ?? 6, 12);
    const enrolments = await ctx.db
      .query("gigaLearnAcademyEnrolments")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .take(40);

    const steps: Array<{
      kind: "resume_course" | "take_assessment" | "revise_weakness";
      title: string;
      detail: string;
      href: string;
      courseSlug?: string;
      progressPercent?: number;
    }> = [];

    const active = enrolments
      .filter((e) => e.status === "active")
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

    for (const row of active) {
      const course = getBuiltinAcademyCourse(row.courseSlug);
      const title = course?.title ?? row.courseSlug;
      steps.push({
        kind: "resume_course",
        title: `Continue ${title}`,
        detail: `Pathway ${row.progressPercent ?? 0}%`,
        href: `/gigalearn/academy/course/?slug=${encodeURIComponent(row.courseSlug)}`,
        courseSlug: row.courseSlug,
        progressPercent: row.progressPercent ?? 0,
      });

      const defs = listBuiltinAssessmentsForCourse(row.courseSlug);
      if (defs.length === 0) continue;
      const attempts = await ctx.db
        .query("gigaLearnAcademyAttempts")
        .withIndex("by_user_course", (q: any) =>
          q.eq("userId", email).eq("courseSlug", row.courseSlug)
        )
        .take(200);
      const passed = new Set<string>();
      for (const a of attempts) {
        if (a.passed && (a.status === "graded" || a.status === "submitted")) {
          passed.add(a.assessmentId);
        }
      }
      const next = defs.find(
        (d) => !passed.has(d.id) && assessmentIsUnlocked(d, passed)
      );
      if (next) {
        const publicDef = getBuiltinAssessment(row.courseSlug, next.id);
        steps.push({
          kind: "take_assessment",
          title: `Assessment: ${publicDef?.title ?? next.id}`,
          detail: title,
          href: `/gigalearn/academy/assess/?course=${encodeURIComponent(row.courseSlug)}&assessment=${encodeURIComponent(next.id)}`,
          courseSlug: row.courseSlug,
        });
      }
    }

    const progress = await ctx.db
      .query("gigaLearnProgress")
      .withIndex("by_user_updated", (q) => q.eq("userId", email))
      .order("desc")
      .take(10);
    for (const row of progress) {
      if (!row.needsReassess) continue;
      steps.push({
        kind: "revise_weakness",
        title: `Revise ${row.subject?.replace(/-/g, " ") || row.topicKey}`,
        detail:
          row.lastScore != null
            ? `Last score ${row.lastScore}% — practise again`
            : "Marked for reassessment",
        href: `/gigalearn/?tab=learn&topic=${encodeURIComponent(row.topicKey)}`,
      });
    }

    return {
      steps: steps.slice(0, cap),
      activeEnrolments: active.length,
      generatedAt: Date.now(),
    };
  },
});

/** Admin-readable aggregate counters (no PII). */
export const getEngagementCountersAdmin = query({
  args: adminCredentialArgs,
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const keys = Object.values(GIGALEARN_ENGAGEMENT_EVENTS);
    const counters: Record<string, number> = {};
    for (const key of keys) {
      counters[key] = await readPlatformCounter(ctx, key);
    }
    return {
      generatedAt: Date.now(),
      counters,
      note: "Aggregate platformCounters only — no learner content or emails.",
    };
  },
});
