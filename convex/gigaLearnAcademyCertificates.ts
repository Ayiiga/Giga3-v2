/**
 * GigaLearn Academy Phase 4 — certificate eligibility, issuance, verification, revocation.
 * Server-authoritative. Does not trust client completion/grade fields.
 * Does not mutate gigaLearnProgress.
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession, tryRequireSession } from "./auth";
import { sessionArgs } from "./validators";
import { getBuiltinAcademyCourse } from "../web/lib/gigalearn/academy/courseCatalog";
import {
  CERTIFICATE_ISSUER,
  CERTIFICATE_TEMPLATE_VERSION,
  buildVerificationUrl,
  evaluateCertificateEligibility,
  modulesCompletedFromLessons,
  publicDisplayName,
} from "../web/lib/gigalearn/academy/certificatePolicy";

const VERIFY_WINDOW_MS = 60_000;
const VERIFY_MAX_PER_WINDOW = 30;
const SITE_ORIGIN = "https://www.giga3ai.com";

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase().slice(0, 80);
}

function issuanceKeyFor(userId: string, courseSlug: string): string {
  return `${userId}::${courseSlug}`;
}

function newPublicId(): string {
  const bytes = new Uint8Array(18);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `gla_${hex}`;
}

async function userIsAdmin(ctx: { db: any }, email: string): Promise<boolean> {
  const invite = await ctx.db
    .query("adminInvites")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first();
  return Boolean(invite && invite.status === "accepted" && invite.role === "admin");
}

async function resolveCourseMeta(ctx: { db: any }, courseSlug: string) {
  const slug = normalizeSlug(courseSlug);
  const builtin = getBuiltinAcademyCourse(slug);
  if (builtin) {
    return {
      slug: builtin.slug,
      title: builtin.title,
      certificateEligible: builtin.certificateEligible,
      source: "catalog" as const,
    };
  }
  const authored = await ctx.db
    .query("gigaLearnAcademyCourses")
    .withIndex("by_slug", (q: any) => q.eq("slug", slug))
    .first();
  if (!authored || authored.status !== "published") return null;
  return {
    slug: authored.slug,
    title: authored.title,
    certificateEligible: Boolean(authored.certificateEligible),
    source: "authored" as const,
  };
}

function parseLessonIds(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => typeof x === "string").map((x) => String(x).slice(0, 80));
  } catch {
    return [];
  }
}

async function passedAssessmentScores(
  ctx: { db: any },
  email: string,
  courseSlug: string
): Promise<Record<string, number>> {
  const rows = await ctx.db
    .query("gigaLearnAcademyAttempts")
    .withIndex("by_user_course", (q: any) => q.eq("userId", email).eq("courseSlug", courseSlug))
    .take(200);
  const best: Record<string, number> = {};
  for (const row of rows) {
    if (!row.passed || (row.status !== "graded" && row.status !== "submitted")) continue;
    const score = typeof row.score === "number" ? row.score : 0;
    const prev = best[row.assessmentId];
    if (prev == null || score > prev) best[row.assessmentId] = score;
  }
  return best;
}

async function buildEligibility(ctx: { db: any }, email: string, courseSlug: string) {
  const course = await resolveCourseMeta(ctx, courseSlug);
  if (!course) {
    return {
      course: null as null,
      enrolment: null as null,
      result: evaluateCertificateEligibility({
        courseSlug,
        certificateEligible: false,
        enrolmentStatus: null,
        completedLessonIds: [],
        completedModuleIds: [],
        passedAssessmentScores: {},
        instructorApproved: false,
        projectApproved: false,
      }),
    };
  }

  const enrolment = await ctx.db
    .query("gigaLearnAcademyEnrolments")
    .withIndex("by_user_course", (q: any) =>
      q.eq("userId", email).eq("courseSlug", course.slug)
    )
    .first();

  const completedLessonIds = parseLessonIds(enrolment?.completedLessonIdsJson);
  const completedModuleIds = modulesCompletedFromLessons(course.slug, completedLessonIds);
  const scores = await passedAssessmentScores(ctx, email, course.slug);

  const result = evaluateCertificateEligibility({
    courseSlug: course.slug,
    certificateEligible: course.certificateEligible,
    enrolmentStatus: enrolment?.status ?? null,
    completedLessonIds,
    completedModuleIds,
    passedAssessmentScores: scores,
    instructorApproved: Boolean(enrolment?.certificateInstructorApprovedAt),
    projectApproved: Boolean(enrolment?.certificateProjectApprovedAt),
  });

  return { course, enrolment, result, scores };
}

async function findActiveCertificate(ctx: { db: any }, userId: string, courseSlug: string) {
  const key = issuanceKeyFor(userId, courseSlug);
  const byKey = await ctx.db
    .query("gigaLearnAcademyCertificates")
    .withIndex("by_issuance_key", (q: any) => q.eq("issuanceKey", key))
    .take(10);
  const valid = byKey
    .filter((c: { status: string }) => c.status === "valid")
    .sort((a: { issuedAt: number }, b: { issuedAt: number }) => a.issuedAt - b.issuedAt);
  return valid[0] ?? null;
}

/** Deduplicate concurrent inserts: keep oldest valid, mark extras revoked as duplicates. */
async function reconcileDuplicates(
  ctx: { db: any },
  userId: string,
  courseSlug: string
) {
  const key = issuanceKeyFor(userId, courseSlug);
  const rows = await ctx.db
    .query("gigaLearnAcademyCertificates")
    .withIndex("by_issuance_key", (q: any) => q.eq("issuanceKey", key))
    .take(20);
  const valid = rows
    .filter((r: { status: string }) => r.status === "valid")
    .sort((a: { issuedAt: number }, b: { issuedAt: number }) => a.issuedAt - b.issuedAt);
  if (valid.length <= 1) return valid[0] ?? null;
  const keeper = valid[0];
  const now = Date.now();
  for (const dup of valid.slice(1)) {
    await ctx.db.patch(dup._id, {
      status: "revoked",
      revokedAt: now,
      revokedBy: "system:duplicate_reconcile",
      revocationReason: "Duplicate concurrent issuance — retained oldest valid certificate.",
      updatedAt: now,
    });
  }
  return keeper;
}

export const getCertificateEligibility = query({
  args: {
    ...sessionArgs,
    courseSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await tryRequireSession(args.sessionToken, ctx);
    if (!email) {
      return {
        eligible: false,
        courseSlug: args.courseSlug.trim().toLowerCase(),
        policyFound: false,
        missing: [
          {
            kind: "enrolment_active" as const,
            detail: "Sign in to check certificate eligibility.",
          },
        ],
        finalScore: null,
        requiredAssessmentIds: [] as string[],
        courseTitle: null,
        existingCertificatePublicId: null,
      };
    }
    const { course, result } = await buildEligibility(ctx, email, args.courseSlug);
    const existing = course
      ? await findActiveCertificate(ctx, email, course.slug)
      : null;
    return {
      ...result,
      courseTitle: course?.title ?? null,
      existingCertificatePublicId: existing?.publicId ?? null,
      // Never echo email or private assessment answers.
    };
  },
});

/**
 * Issue a certificate when eligibility is satisfied.
 * Idempotent for the same user+course. Ignores client-supplied grades/completion.
 */
export const issueCertificate = mutation({
  args: {
    ...sessionArgs,
    courseSlug: v.string(),
    /** Optional client hint only — never used for eligibility or grades. */
    clientRequestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const { course, enrolment, result, scores } = await buildEligibility(
      ctx,
      email,
      args.courseSlug
    );
    if (!course || !enrolment) {
      throw new Error("Enrolment required for certificate issuance.");
    }
    if (!result.eligible) {
      throw new Error(
        `Not eligible for a certificate: ${result.missing.map((m) => m.detail).join(" ")}`
      );
    }

    const existing = await findActiveCertificate(ctx, email, course.slug);
    if (existing) {
      return {
        duplicate: true as const,
        publicId: existing.publicId,
        certificateId: existing._id,
        status: existing.status,
        verificationUrl: existing.verificationUrl,
        issuedAt: existing.issuedAt,
      };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    const display = publicDisplayName(user?.name, "Learner");
    const now = Date.now();
    const publicId = newPublicId();
    const verificationUrl = buildVerificationUrl(publicId, SITE_ORIGIN);
    const key = issuanceKeyFor(email, course.slug);
    const finalGrade = result.finalScore;

    const certificateId = await ctx.db.insert("gigaLearnAcademyCertificates", {
      publicId,
      issuanceKey: key,
      userId: email,
      learnerDisplayName: display,
      courseSlug: course.slug,
      courseTitle: course.title,
      issuingOrganization: CERTIFICATE_ISSUER,
      issuedAt: now,
      completedAt: now,
      finalGrade: finalGrade ?? undefined,
      status: "valid",
      templateVersion: CERTIFICATE_TEMPLATE_VERSION,
      verificationUrl,
      updatedAt: now,
    });

    // Concurrency: another mutation may have inserted in parallel.
    const keeper = await reconcileDuplicates(ctx, email, course.slug);
    const row = keeper ?? (await ctx.db.get(certificateId));
    if (!row) throw new Error("Certificate issuance failed.");

    // Mark enrolment completed when a certificate is issued (server path).
    if (enrolment.status !== "completed") {
      await ctx.db.patch(enrolment._id, {
        status: "completed",
        updatedAt: now,
      });
    }

    // scores referenced to prove we do not accept client grades
    void scores;
    void args.clientRequestId;

    return {
      duplicate: row._id !== certificateId,
      publicId: row.publicId,
      certificateId: row._id,
      status: row.status,
      verificationUrl: row.verificationUrl,
      issuedAt: row.issuedAt,
    };
  },
});

export const listMyCertificates = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    // Soft-fail invalid/expired tokens so Academy home useQuery cannot crash.
    const email = await tryRequireSession(args.sessionToken, ctx);
    if (!email) return [];
    const rows = await ctx.db
      .query("gigaLearnAcademyCertificates")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .take(100);
    return rows
      .sort((a, b) => b.issuedAt - a.issuedAt)
      .map((r) => ({
        publicId: r.publicId,
        courseSlug: r.courseSlug,
        courseTitle: r.courseTitle,
        issuingOrganization: r.issuingOrganization,
        issuedAt: r.issuedAt,
        completedAt: r.completedAt,
        finalGrade: r.finalGrade,
        status: r.status,
        verificationUrl: r.verificationUrl,
        templateVersion: r.templateVersion,
        // No email, no storage URLs in list (use download payload separately).
      }));
  },
});

/** Authenticated payload for PDF re-download — regenerates from record; does not re-issue. */
export const getMyCertificateForDownload = query({
  args: {
    ...sessionArgs,
    publicId: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const publicId = args.publicId.trim().slice(0, 80);
    const row = await ctx.db
      .query("gigaLearnAcademyCertificates")
      .withIndex("by_public_id", (q) => q.eq("publicId", publicId))
      .first();
    if (!row || row.userId !== email) return null;
    return {
      publicId: row.publicId,
      learnerDisplayName: row.learnerDisplayName,
      courseTitle: row.courseTitle,
      courseSlug: row.courseSlug,
      issuingOrganization: row.issuingOrganization,
      issuedAt: row.issuedAt,
      completedAt: row.completedAt,
      finalGrade: row.finalGrade ?? null,
      status: row.status,
      templateVersion: row.templateVersion,
      verificationUrl: row.verificationUrl,
    };
  },
});

/**
 * Public verification — minimal PII. Rate-limited per publicId bucket.
 * Does not expose email, answers, or learning history.
 */
export const verifyCertificatePublic = query({
  args: {
    publicId: v.string(),
    /** Optional opaque client bucket hint (e.g. coarse IP hash from edge) — not trusted for auth. */
    clientBucket: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const publicId = args.publicId.trim().slice(0, 80);
    if (!publicId.startsWith("gla_") || publicId.length < 12) {
      return {
        found: false as const,
        authentic: false as const,
        rateLimited: false as const,
      };
    }

    // Rate limit: queries cannot write — soft check only via existing bucket count.
    // Mutations would be needed for hard counters; we apply a read-side guard using
    // optional bucket rows updated by recordVerifyHit mutation from the UI.
    const bucketKey = `verify:${publicId}:${(args.clientBucket ?? "anon").slice(0, 64)}`;
    const limitRow = await ctx.db
      .query("gigaLearnAcademyCertVerifyLimits")
      .withIndex("by_bucket", (q) => q.eq("bucketKey", bucketKey))
      .first();
    if (
      limitRow &&
      Date.now() - limitRow.windowStartedAt < VERIFY_WINDOW_MS &&
      limitRow.count > VERIFY_MAX_PER_WINDOW
    ) {
      return {
        found: false as const,
        authentic: false as const,
        rateLimited: true as const,
      };
    }

    const row = await ctx.db
      .query("gigaLearnAcademyCertificates")
      .withIndex("by_public_id", (q) => q.eq("publicId", publicId))
      .first();

    if (!row) {
      return {
        found: false as const,
        authentic: false as const,
        rateLimited: false as const,
      };
    }

    return {
      found: true as const,
      authentic: true as const,
      rateLimited: false as const,
      status: row.status,
      courseTitle: row.courseTitle,
      issuingOrganization: row.issuingOrganization,
      issuedAt: row.issuedAt,
      completedAt: row.completedAt,
      publicId: row.publicId,
      learnerDisplayName: row.learnerDisplayName,
      finalGrade: row.status === "valid" ? row.finalGrade ?? null : null,
      revokedAt: row.revokedAt ?? null,
      // Explicitly omit: userId/email, pdfStorageId, issuanceKey, revocation actor email details
    };
  },
});

/** Record a verification hit for rate limiting (called from public page). */
export const recordVerifyHit = mutation({
  args: {
    publicId: v.string(),
    clientBucket: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const publicId = args.publicId.trim().slice(0, 80);
    if (!publicId.startsWith("gla_")) return { ok: false as const };
    const bucketKey = `verify:${publicId}:${(args.clientBucket ?? "anon").slice(0, 64)}`;
    const now = Date.now();
    const existing = await ctx.db
      .query("gigaLearnAcademyCertVerifyLimits")
      .withIndex("by_bucket", (q) => q.eq("bucketKey", bucketKey))
      .first();
    if (!existing || now - existing.windowStartedAt >= VERIFY_WINDOW_MS) {
      if (existing) {
        await ctx.db.patch(existing._id, { windowStartedAt: now, count: 1 });
      } else {
        await ctx.db.insert("gigaLearnAcademyCertVerifyLimits", {
          bucketKey,
          windowStartedAt: now,
          count: 1,
        });
      }
      return { ok: true as const };
    }
    await ctx.db.patch(existing._id, { count: existing.count + 1 });
    return { ok: true as const, count: existing.count + 1 };
  },
});

export const revokeCertificate = mutation({
  args: {
    ...sessionArgs,
    publicId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const allowed = await userIsAdmin(ctx, email);
    if (!allowed) throw new Error("Not authorized to revoke Academy certificates.");

    const publicId = args.publicId.trim().slice(0, 80);
    const row = await ctx.db
      .query("gigaLearnAcademyCertificates")
      .withIndex("by_public_id", (q) => q.eq("publicId", publicId))
      .first();
    if (!row) throw new Error("Certificate not found.");
    if (row.status === "revoked") {
      return { ok: true as const, alreadyRevoked: true as const, publicId };
    }
    const now = Date.now();
    await ctx.db.patch(row._id, {
      status: "revoked",
      revokedAt: now,
      revokedBy: email,
      revocationReason: args.reason.trim().slice(0, 500),
      updatedAt: now,
    });
    return { ok: true as const, alreadyRevoked: false as const, publicId };
  },
});

export const canRevokeCertificates = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await tryRequireSession(args.sessionToken, ctx);
    if (!email) return { allowed: false as const };
    return { allowed: await userIsAdmin(ctx, email) };
  },
});
