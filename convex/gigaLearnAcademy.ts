/**
 * GigaLearn Academy — Phase 1 backend.
 * Additive: catalogue merge, enrolment, pathway resume, author drafts.
 * Does not mutate gigaLearnProgress or enterprise orgEnrollments.
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireSession, tryRequireSession } from "./auth";
import { sessionArgs } from "./validators";
import { isSubscriptionActive } from "./creditsConfig";
import {
  filterAcademyCourses,
  getBuiltinAcademyCourse,
  listBuiltinAcademyCourses,
  toAcademyListItem,
} from "../web/lib/gigalearn/academy/courseCatalog";
import type {
  AcademyCourse,
  AcademyCourseListItem,
  AcademyModule,
} from "../web/lib/gigalearn/academy/types";
import { buildAcademyTutorFocus } from "../web/lib/gigalearn/academy/tutorContext";

const MAX_MODULES_JSON = 80_000;
const MAX_STRING = 4_000;
const MAX_OBJECTIVES = 20;

function normalizeSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseModulesJson(raw: string): AcademyModule[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as AcademyModule[];
  } catch {
    return [];
  }
}

function authoredToCourse(row: {
  slug: string;
  title: string;
  description: string;
  subject: string;
  category: string;
  difficulty: AcademyCourse["difficulty"];
  durationMinutes: number;
  learningObjectives: string[];
  prerequisites: string[];
  curriculumPreview: string;
  assessmentDescription: string;
  instructorName?: string;
  instructorBio?: string;
  access: AcademyCourse["access"];
  creditCost?: number;
  certificateEligible: boolean;
  completionRequirements: string;
  modulesJson: string;
  status: AcademyCourse["status"];
}): AcademyCourse {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    subject: row.subject,
    category: row.category,
    difficulty: row.difficulty,
    durationMinutes: row.durationMinutes,
    learningObjectives: row.learningObjectives,
    prerequisites: row.prerequisites,
    curriculumPreview: row.curriculumPreview,
    assessmentDescription: row.assessmentDescription,
    instructorName: row.instructorName,
    instructorBio: row.instructorBio,
    access: row.access,
    creditCost: row.creditCost,
    certificateEligible: row.certificateEligible,
    completionRequirements: row.completionRequirements,
    modules: parseModulesJson(row.modulesJson),
    source: "authored",
    status: row.status,
  };
}

async function resolveCourse(
  ctx: { db: any },
  slug: string
): Promise<AcademyCourse | null> {
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;
  const builtin = getBuiltinAcademyCourse(normalized);
  if (builtin) return builtin;
  const row = await ctx.db
    .query("gigaLearnAcademyCourses")
    .withIndex("by_slug", (q: any) => q.eq("slug", normalized))
    .first();
  if (!row) return null;
  return authoredToCourse(row);
}

async function userMayAuthor(ctx: { db: any }, email: string): Promise<boolean> {
  const invite = await ctx.db
    .query("adminInvites")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first();
  if (
    invite &&
    invite.status === "accepted" &&
    (invite.role === "admin" || invite.role === "creator")
  ) {
    return true;
  }
  return false;
}

async function assertEnrolmentEntitlement(
  ctx: { db: any },
  email: string,
  course: AcademyCourse
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (course.access === "free") return { ok: true };

  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first();
  if (!user) return { ok: false, reason: "Account not found." };

  const subscriptionActive = isSubscriptionActive(
    user.subscriptionPlan ?? "free",
    user.subscriptionExpiresAt
  );

  if (course.access === "subscription") {
    if (!subscriptionActive) {
      return {
        ok: false,
        reason: "An active Giga3 subscription is required for this course.",
      };
    }
    return { ok: true };
  }

  // credits access: allow active subscribers OR sufficient credit balance
  if (course.access === "credits") {
    if (subscriptionActive) return { ok: true };
    const need = Math.max(0, Math.floor(course.creditCost ?? 1));
    const have = user.credits ?? 0;
    if (have < need) {
      return {
        ok: false,
        reason: `This course needs at least ${need} credits (you have ${have}).`,
      };
    }
    return { ok: true };
  }

  return { ok: false, reason: "Access not allowed." };
}

/** Public catalogue — published builtin + published authored courses. */
export const listPublishedCourses = query({
  args: {
    query: v.optional(v.string()),
    subject: v.optional(v.string()),
    category: v.optional(v.string()),
    difficulty: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const builtin = listBuiltinAcademyCourses().map(toAcademyListItem);
    const authoredRows = await ctx.db
      .query("gigaLearnAcademyCourses")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .take(100);
    const authored = authoredRows.map((row) =>
      toAcademyListItem(authoredToCourse(row))
    );
    // Builtin slugs win over authored duplicates.
    const bySlug = new Map<string, AcademyCourseListItem>();
    for (const item of authored) bySlug.set(item.slug, item);
    for (const item of builtin) bySlug.set(item.slug, item);
    const merged = Array.from(bySlug.values()).sort((a, b) =>
      a.title.localeCompare(b.title)
    );
    return filterAcademyCourses(merged, {
      query: args.query,
      subject: args.subject,
      category: args.category,
      difficulty: args.difficulty,
    });
  },
});

export const getCourse = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const course = await resolveCourse(ctx, args.slug);
    if (!course) return null;
    if (course.status !== "published" && course.source === "authored") {
      // Draft/archived authored courses are not public.
      return null;
    }
    return course;
  },
});

export const getMyEnrolment = query({
  args: {
    ...sessionArgs,
    courseSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await tryRequireSession(args.sessionToken, ctx);
    if (!email) return null;
    const slug = normalizeSlug(args.courseSlug);
    const row = await ctx.db
      .query("gigaLearnAcademyEnrolments")
      .withIndex("by_user_course", (q) => q.eq("userId", email).eq("courseSlug", slug))
      .first();
    if (!row) return null;
    return {
      courseSlug: row.courseSlug,
      status: row.status,
      enrolledAt: row.enrolledAt,
      lastModuleId: row.lastModuleId,
      lastLessonId: row.lastLessonId,
      progressPercent: row.progressPercent,
      updatedAt: row.updatedAt,
    };
  },
});

export const listMyEnrolments = query({
  args: {
    ...sessionArgs,
    includeWithdrawn: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const rows = await ctx.db
      .query("gigaLearnAcademyEnrolments")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .take(100);
    return rows
      .filter((r) => args.includeWithdrawn || r.status !== "withdrawn")
      .map((row) => ({
        courseSlug: row.courseSlug,
        status: row.status,
        enrolledAt: row.enrolledAt,
        lastModuleId: row.lastModuleId,
        lastLessonId: row.lastLessonId,
        progressPercent: row.progressPercent,
        updatedAt: row.updatedAt,
      }));
  },
});

/**
 * Phase 2 — server-authorized Academy tutoring context.
 * Verifies the caller's enrolment; never trusts client-supplied ownership.
 * Does not mark lessons complete or mutate gigaLearnProgress.
 */
export const getEnrolledTutorContext = query({
  args: {
    ...sessionArgs,
    courseSlug: v.string(),
    moduleId: v.optional(v.string()),
    lessonId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const course = await resolveCourse(ctx, args.courseSlug);
    if (!course || course.status !== "published") {
      return { ok: false as const, reason: "course_unavailable" as const };
    }

    const slug = course.slug;
    const enrolment = await ctx.db
      .query("gigaLearnAcademyEnrolments")
      .withIndex("by_user_course", (q) => q.eq("userId", email).eq("courseSlug", slug))
      .first();

    if (!enrolment || enrolment.status === "withdrawn") {
      return { ok: false as const, reason: "not_enrolled" as const };
    }

    const moduleId = args.moduleId?.trim() || enrolment.lastModuleId;
    const lessonId = args.lessonId?.trim() || enrolment.lastLessonId;
    const focus = buildAcademyTutorFocus(course, moduleId, lessonId);
    if (!focus) {
      return { ok: false as const, reason: "missing_materials" as const };
    }

    return {
      ok: true as const,
      courseSlug: focus.courseSlug,
      courseTitle: focus.courseTitle,
      subject: course.subject,
      difficulty: course.difficulty,
      enrolmentStatus: enrolment.status,
      progressPercent: enrolment.progressPercent,
      moduleId: focus.module.id,
      moduleTitle: focus.module.title,
      lessonId: focus.lesson.id,
      lessonTitle: focus.lesson.title,
      lessonSummary: focus.lesson.summary,
      activityKind: focus.lesson.activityKind,
      materialsBlock: focus.materialsBlock,
      revisionHint: focus.revisionHint,
      nextLesson: focus.next,
      /** Explicit: tutoring never auto-completes pathway lessons. */
      tutoringCompletesLesson: false as const,
    };
  },
});

export const enrolInCourse = mutation({
  args: {
    ...sessionArgs,
    courseSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const course = await resolveCourse(ctx, args.courseSlug);
    if (!course || course.status !== "published") {
      throw new Error("Course not found or not available.");
    }

    const entitlement = await assertEnrolmentEntitlement(ctx, email, course);
    if (!entitlement.ok) {
      throw new Error(entitlement.reason);
    }

    const slug = course.slug;
    // Collect all rows for this user+course so retries never create duplicates.
    const existingRows = await ctx.db
      .query("gigaLearnAcademyEnrolments")
      .withIndex("by_user_course", (q) => q.eq("userId", email).eq("courseSlug", slug))
      .collect();
    const existing =
      existingRows.find((row) => row.status === "active") ??
      existingRows.find((row) => row.status === "completed") ??
      existingRows.find((row) => row.status === "withdrawn") ??
      existingRows[0];

    // Idempotent for active/completed — preserve progress; do not insert again.
    if (existing && existing.status === "active") {
      return {
        enrolmentId: existing._id,
        reactivated: false as const,
        alreadyEnrolled: true as const,
      };
    }
    if (existing && existing.status === "completed") {
      return {
        enrolmentId: existing._id,
        reactivated: false as const,
        alreadyCompleted: true as const,
      };
    }

    const now = Date.now();
    if (existing && existing.status === "withdrawn") {
      await ctx.db.patch(existing._id, {
        status: "active",
        enrolledAt: now,
        // Keep prior pathway progress when reactivating.
        progressPercent: existing.progressPercent ?? 0,
        lastModuleId: existing.lastModuleId,
        lastLessonId: existing.lastLessonId,
        completedLessonIdsJson: existing.completedLessonIdsJson,
        updatedAt: now,
      });
      await ctx.runMutation(internal.gigaLearnEngagement.bumpLearnerEventInternal, {
        userId: email,
        event: "enrol",
      });
      return { enrolmentId: existing._id, reactivated: true as const };
    }

    if (existingRows.length > 0) {
      // Defensive: unexpected status — reuse the oldest row instead of inserting.
      return {
        enrolmentId: existingRows[0]._id,
        reactivated: false as const,
        alreadyEnrolled: true as const,
      };
    }

    const enrolmentId = await ctx.db.insert("gigaLearnAcademyEnrolments", {
      userId: email,
      courseSlug: slug,
      status: "active",
      enrolledAt: now,
      progressPercent: 0,
      updatedAt: now,
    });
    await ctx.runMutation(internal.gigaLearnEngagement.bumpLearnerEventInternal, {
      userId: email,
      event: "enrol",
    });
    return { enrolmentId, reactivated: false as const };
  },
});

/** Pathway resume checkpoint — Academy-only; does not write gigaLearnProgress. */
export const updatePathwayProgress = mutation({
  args: {
    ...sessionArgs,
    courseSlug: v.string(),
    moduleId: v.string(),
    lessonId: v.string(),
    progressPercent: v.optional(v.number()),
    markCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const course = await resolveCourse(ctx, args.courseSlug);
    if (!course || course.status !== "published") {
      throw new Error("Course not found.");
    }
    const slug = course.slug;
    const enrolment = await ctx.db
      .query("gigaLearnAcademyEnrolments")
      .withIndex("by_user_course", (q) => q.eq("userId", email).eq("courseSlug", slug))
      .first();
    if (!enrolment || enrolment.status === "withdrawn") {
      throw new Error("Enrolment required.");
    }

    const moduleOk = course.modules.some(
      (m) =>
        m.id === args.moduleId && m.lessons.some((l) => l.id === args.lessonId)
    );
    if (!moduleOk) throw new Error("Invalid pathway checkpoint.");

    const pct = Math.max(
      0,
      Math.min(100, Math.round(args.progressPercent ?? enrolment.progressPercent))
    );
    const now = Date.now();
    let completedLessonIds: string[] = [];
    try {
      const parsed = enrolment.completedLessonIdsJson
        ? (JSON.parse(enrolment.completedLessonIdsJson) as unknown)
        : [];
      if (Array.isArray(parsed)) {
        completedLessonIds = parsed.filter((x) => typeof x === "string").map((x) => x.slice(0, 80));
      }
    } catch {
      completedLessonIds = [];
    }
    const lessonId = args.lessonId.slice(0, 80);
    if (!completedLessonIds.includes(lessonId)) {
      completedLessonIds.push(lessonId);
    }
    // Cap stored history — pathway size is small for builtin courses.
    completedLessonIds = completedLessonIds.slice(-200);

    await ctx.db.patch(enrolment._id, {
      lastModuleId: args.moduleId.slice(0, 80),
      lastLessonId: lessonId,
      progressPercent: pct,
      completedLessonIdsJson: JSON.stringify(completedLessonIds),
      // Client markCompleted may update enrolment status for UX, but certificate
      // eligibility never trusts this flag — it re-checks assessments server-side.
      status: args.markCompleted ? "completed" : enrolment.status,
      updatedAt: now,
    });
    await ctx.runMutation(internal.gigaLearnEngagement.bumpLearnerEventInternal, {
      userId: email,
      event: "pathway_update",
    });
    return { ok: true as const, completedLessonIds };
  },
});

/** Admin/creator: grant instructor approval for certificate policies that require it. */
export const approveEnrolmentForCertificate = mutation({
  args: {
    ...sessionArgs,
    courseSlug: v.string(),
    learnerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const invite = await ctx.db
      .query("adminInvites")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    const allowed =
      invite &&
      invite.status === "accepted" &&
      (invite.role === "admin" || invite.role === "creator");
    if (!allowed) throw new Error("Not authorized to approve Academy certificates.");

    const slug = normalizeSlug(args.courseSlug);
    const learner = args.learnerUserId.trim().toLowerCase().slice(0, 320);
    const enrolment = await ctx.db
      .query("gigaLearnAcademyEnrolments")
      .withIndex("by_user_course", (q) => q.eq("userId", learner).eq("courseSlug", slug))
      .first();
    if (!enrolment || enrolment.status === "withdrawn") {
      throw new Error("Learner enrolment not found.");
    }
    const now = Date.now();
    await ctx.db.patch(enrolment._id, {
      certificateInstructorApprovedAt: now,
      certificateInstructorApprovedBy: email,
      updatedAt: now,
    });
    return { ok: true as const };
  },
});

export const canAuthorCourses = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await tryRequireSession(args.sessionToken, ctx);
    if (!email) return { allowed: false as const };
    const allowed = await userMayAuthor(ctx, email);
    return { allowed };
  },
});

export const listMyAuthoredCourses = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const allowed = await userMayAuthor(ctx, email);
    if (!allowed) return [];
    const rows = await ctx.db
      .query("gigaLearnAcademyCourses")
      .withIndex("by_author", (q) => q.eq("authorUserId", email))
      .order("desc")
      .take(50);
    return rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      status: row.status,
      updatedAt: row.updatedAt,
      category: row.category,
      subject: row.subject,
    }));
  },
});

/** Authoring foundation — create/update draft or published course (authorized only). */
export const upsertAuthoredCourse = mutation({
  args: {
    ...sessionArgs,
    slug: v.string(),
    title: v.string(),
    description: v.string(),
    subject: v.string(),
    category: v.string(),
    difficulty: v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("advanced")
    ),
    durationMinutes: v.number(),
    learningObjectives: v.array(v.string()),
    prerequisites: v.array(v.string()),
    curriculumPreview: v.string(),
    assessmentDescription: v.string(),
    instructorName: v.optional(v.string()),
    instructorBio: v.optional(v.string()),
    access: v.union(
      v.literal("free"),
      v.literal("credits"),
      v.literal("subscription")
    ),
    creditCost: v.optional(v.number()),
    certificateEligible: v.boolean(),
    completionRequirements: v.string(),
    modulesJson: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived")
    ),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const allowed = await userMayAuthor(ctx, email);
    if (!allowed) {
      throw new Error("Not authorized to author Academy courses.");
    }

    const slug = normalizeSlug(args.slug);
    if (slug.length < 3) throw new Error("Slug must be at least 3 characters.");
    if (getBuiltinAcademyCourse(slug)) {
      throw new Error("Cannot overwrite a built-in catalogue course slug.");
    }
    if (args.modulesJson.length > MAX_MODULES_JSON) {
      throw new Error("Pathway JSON is too large.");
    }
    const modules = parseModulesJson(args.modulesJson);
    if (!Array.isArray(modules)) throw new Error("modulesJson must be an array.");

    const now = Date.now();
    const patch = {
      title: args.title.trim().slice(0, 160),
      description: args.description.trim().slice(0, MAX_STRING),
      subject: args.subject.trim().slice(0, 80),
      category: args.category.trim().slice(0, 80),
      difficulty: args.difficulty,
      durationMinutes: Math.max(1, Math.min(10_000, Math.round(args.durationMinutes))),
      learningObjectives: args.learningObjectives
        .map((s) => s.trim().slice(0, 300))
        .filter(Boolean)
        .slice(0, MAX_OBJECTIVES),
      prerequisites: args.prerequisites
        .map((s) => s.trim().slice(0, 300))
        .filter(Boolean)
        .slice(0, MAX_OBJECTIVES),
      curriculumPreview: args.curriculumPreview.trim().slice(0, MAX_STRING),
      assessmentDescription: args.assessmentDescription.trim().slice(0, MAX_STRING),
      instructorName: args.instructorName?.trim().slice(0, 120),
      instructorBio: args.instructorBio?.trim().slice(0, MAX_STRING),
      access: args.access,
      creditCost:
        args.access === "credits"
          ? Math.max(0, Math.min(500, Math.round(args.creditCost ?? 1)))
          : undefined,
      certificateEligible: args.certificateEligible,
      completionRequirements: args.completionRequirements.trim().slice(0, MAX_STRING),
      modulesJson: JSON.stringify(modules),
      status: args.status,
      updatedAt: now,
    };

    if (!patch.title || !patch.description) {
      throw new Error("Title and description are required.");
    }

    const existing = await ctx.db
      .query("gigaLearnAcademyCourses")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (existing) {
      if (existing.authorUserId !== email) {
        const invite = await ctx.db
          .query("adminInvites")
          .withIndex("by_email", (q) => q.eq("email", email))
          .first();
        if (!(invite && invite.status === "accepted" && invite.role === "admin")) {
          throw new Error("Only the author or an admin can update this course.");
        }
      }
      await ctx.db.patch(existing._id, patch);
      return { courseId: existing._id, slug, created: false as const };
    }

    const courseId = await ctx.db.insert("gigaLearnAcademyCourses", {
      slug,
      authorUserId: email,
      createdAt: now,
      ...patch,
    });
    return { courseId, slug, created: true as const };
  },
});
