"use client";

import { AcademyChrome } from "@/components/gigalearn/academy/AcademyChrome";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSignInPrompt } from "@/components/seo/ProductSignInPrompt";
import { getSessionToken } from "@/lib/auth";
import { hasPersistedAuth } from "@/lib/auth/sessionRestore";
import {
  countPathwayLessons,
  getBuiltinAcademyCourse,
  resolveResumeLesson,
} from "@/lib/gigalearn/academy/courseCatalog";
import {
  ALREADY_ENROLLED_MESSAGE,
  friendlyAcademyEnrolError,
} from "@/lib/gigalearn/academy/enrolErrors";
import { hrefForAcademyResource } from "@/lib/gigalearn/academy/resourceLinks";
import {
  getTechCourseMeta,
  techPracticeHref,
} from "@/lib/gigalearn/academy/techBanks/techBankMeta";
import { ACADEMY_SURFACE_CLASS } from "@/lib/gigalearn/academy/visualTheme";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, Lock, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

function accessBadge(access: string, creditCost?: number): string {
  if (access === "free") return "Free access";
  if (access === "subscription") return "Subscription required";
  return `Credits required${creditCost != null ? ` (${creditCost}+)` : ""}`;
}

function AcademyCourseDetailInner() {
  const params = useSearchParams();
  const slug = (params.get("slug") || "").trim().toLowerCase();
  const sessionToken = getSessionToken();
  const remoteCourse = useQuery(api.gigaLearnAcademy.getCourse, slug ? { slug } : "skip");
  const builtinCourse = useMemo(
    () => (slug ? getBuiltinAcademyCourse(slug) ?? null : null),
    [slug]
  );
  const course = remoteCourse === undefined ? builtinCourse : remoteCourse;
  const enrolment = useQuery(
    api.gigaLearnAcademy.getMyEnrolment,
    sessionToken && slug ? { sessionToken, courseSlug: slug } : "skip"
  );
  const enrol = useMutation(api.gigaLearnAcademy.enrolInCourse);
  const updateProgress = useMutation(api.gigaLearnAcademy.updatePathwayProgress);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const pathwayCounts = useMemo(
    () => (course ? countPathwayLessons(course) : { total: 0, required: 0 }),
    [course]
  );

  const resume = useMemo(() => {
    if (!course) return null;
    return resolveResumeLesson(course, enrolment?.lastModuleId, enrolment?.lastLessonId);
  }, [course, enrolment]);

  if (!slug) {
    return (
      <AcademyChrome active="course" title="Course not found">
        <p className="text-sm text-muted">Missing course slug.</p>
        <ButtonLink href="/gigalearn/academy/" className="mt-4 min-h-11">
          Back to catalogue
        </ButtonLink>
      </AcademyChrome>
    );
  }

  if (course === null) {
    return (
      <AcademyChrome active="course" title="Course not found">
        <p className="text-sm text-muted">
          This Academy course is unavailable. Built-in catalogue courses do not replace Marketplace
          Creator Academy listings.
        </p>
        <ButtonLink href="/gigalearn/academy/" className="mt-4 min-h-11">
          Back to catalogue
        </ButtonLink>
      </AcademyChrome>
    );
  }

  const isEnrolled = enrolment?.status === "active" || enrolment?.status === "completed";

  async function onEnrol() {
    if (!sessionToken) {
      setError("Sign in required to enrol.");
      return;
    }
    if (isEnrolled) {
      setError(null);
      setInfo(ALREADY_ENROLLED_MESSAGE);
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const result = await enrol({ sessionToken, courseSlug: slug });
      if ("alreadyEnrolled" in result && result.alreadyEnrolled) {
        setInfo(ALREADY_ENROLLED_MESSAGE);
      } else if ("alreadyCompleted" in result && result.alreadyCompleted) {
        setInfo("You have already completed this course.");
      } else {
        setInfo(
          result.reactivated
            ? "Enrolment reactivated. You can resume your pathway."
            : "Enrolled successfully. Start with the first module below."
        );
      }
    } catch (e) {
      setError(friendlyAcademyEnrolError(e));
    } finally {
      setBusy(false);
    }
  }

  async function onResumeCheckpoint(moduleId: string, lessonId: string, index: number) {
    if (!sessionToken || !isEnrolled) return;
    setBusy(true);
    setError(null);
    try {
      const pct = Math.round(((index + 1) / Math.max(1, pathwayCounts.total)) * 100);
      await updateProgress({
        sessionToken,
        courseSlug: slug,
        moduleId,
        lessonId,
        progressPercent: pct,
        markCompleted: pct >= 100,
      });
      setInfo("Pathway progress saved (Academy enrolment only — does not change topic mastery scores).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save progress.");
    } finally {
      setBusy(false);
    }
  }

  let lessonIndex = 0;

  return (
    <AcademyChrome
      active="course"
      title={course.title}
      subtitle={`${course.subject} · ${course.category} · ${course.difficulty}`}
    >
      <section
        className={cn(ACADEMY_SURFACE_CLASS.dashboard, "min-w-0 space-y-4 p-4 sm:p-5")}
      >
        <div className="flex min-w-0 flex-wrap gap-2">
          <span className="academy-visual-chip rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
            {accessBadge(course.access, course.creditCost)}
          </span>
          {course.certificateEligible ? (
            <span className="academy-visual-chip rounded-full px-2.5 py-0.5 text-[11px]">
              Certificate eligibility configured (issuance in a later phase)
            </span>
          ) : null}
          {enrolment ? (
            <span className="academy-visual-chip rounded-full px-2.5 py-0.5 text-[11px]">
              {enrolment.status} · {enrolment.progressPercent}% pathway
            </span>
          ) : null}
        </div>

        <p className="academy-visual-muted text-sm leading-relaxed">{course.description}</p>

        {(() => {
          const tech = getTechCourseMeta(slug);
          if (!tech) return null;
          return (
            <div
              className="academy-visual-tile min-w-0 space-y-2 rounded-xl p-3"
              data-testid="tech-hub-course-cta"
            >
              <h2 className="text-sm font-semibold">Technology Learning Hub</h2>
              <p className="academy-visual-muted text-sm">
                {tech.awaitingMaterials
                  ? "Course pathway is ready. Interactive question practice unlocks after the source PDF is imported and validated."
                  : `${tech.approvedQuestionCount} approved practice questions across ${tech.topics.length} topics (unique items after near-duplicate removal).`}
              </p>
              <ButtonLink
                href={techPracticeHref(slug, { mode: "learn" })}
                className="academy-visual-cta min-h-11"
              >
                {tech.awaitingMaterials ? "Open hub (awaiting bank)" : "Start interactive practice"}
              </ButtonLink>
            </div>
          );
        })()}

        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <div className="academy-visual-tile min-w-0 rounded-xl p-3">
            <h2 className="text-sm font-semibold">Learning objectives</h2>
            <ul className="academy-visual-muted mt-2 list-disc space-y-1 pl-5 text-sm">
              {course.learningObjectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </div>
          <div className="academy-visual-tile min-w-0 rounded-xl p-3">
            <h2 className="text-sm font-semibold">Prerequisites</h2>
            <ul className="academy-visual-muted mt-2 list-disc space-y-1 pl-5 text-sm">
              {course.prerequisites.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid min-w-0 gap-3 text-sm sm:grid-cols-2">
          <p className="academy-visual-muted">
            <span className="font-semibold text-[var(--av-fg)]">Curriculum preview: </span>
            {course.curriculumPreview}
          </p>
          <p className="academy-visual-muted">
            <span className="font-semibold text-[var(--av-fg)]">Assessment: </span>
            {course.assessmentDescription}
          </p>
          <p className="academy-visual-muted">
            <span className="font-semibold text-[var(--av-fg)]">Completion: </span>
            {course.completionRequirements}
          </p>
          {course.instructorName ? (
            <p className="academy-visual-muted">
              <span className="font-semibold text-[var(--av-fg)]">Instructor: </span>
              {course.instructorName}
              {course.instructorBio ? ` — ${course.instructorBio}` : ""}
            </p>
          ) : null}
        </div>

        {!sessionToken && !hasPersistedAuth() ? (
          <ProductSignInPrompt
            productName="GigaLearn Academy"
            description="Sign in to enrol. Enrolment and payment status are verified on the server — not in the browser alone."
            nextPath={`/gigalearn/academy/course/?slug=${encodeURIComponent(slug)}`}
          />
        ) : (
          <div className="flex min-w-0 flex-wrap gap-2 sm:gap-3">
            {!isEnrolled ? (
              <Button
                type="button"
                className="academy-visual-cta academy-visual-cta--success min-h-11 w-full sm:w-auto"
                disabled={busy || !sessionToken}
                onClick={() => void onEnrol()}
              >
                {busy ? "Enrolling…" : "Enrol in course"}
              </Button>
            ) : (
              <>
                <span
                  className={cn(
                    ACADEMY_SURFACE_CLASS.performance,
                    "inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold"
                  )}
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                  Enrolled
                </span>
                {resume ? (
                  <Button
                    type="button"
                    className="academy-visual-cta academy-visual-cta--success min-h-11 w-full sm:w-auto"
                    disabled={busy}
                    onClick={() =>
                      void onResumeCheckpoint(
                        resume.moduleId,
                        resume.lessonId,
                        Math.max(0, pathwayCounts.total - 1)
                      )
                    }
                  >
                    <PlayCircle className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                    Resume learning
                  </Button>
                ) : null}
              </>
            )}
            <ButtonLink
              href="/gigalearn/academy/my/"
              className="academy-visual-cta min-h-11 w-full sm:w-auto"
            >
              My courses
            </ButtonLink>
            {isEnrolled ? (
              <ButtonLink
                href={`/gigalearn/academy/assess/?course=${encodeURIComponent(slug)}`}
                className="academy-visual-cta min-h-11 w-full sm:w-auto"
              >
                Assessments
              </ButtonLink>
            ) : null}
            {isEnrolled && course.certificateEligible ? (
              <ButtonLink
                href={`/gigalearn/academy/certificates/?course=${encodeURIComponent(slug)}`}
                className={cn(
                  ACADEMY_SURFACE_CLASS.certificates,
                  "academy-visual-cta min-h-11 w-full sm:w-auto"
                )}
              >
                Certificates
              </ButtonLink>
            ) : null}
            {course.access !== "free" ? (
              <ButtonLink
                href={siteConfig.links.credits}
                className="academy-visual-cta min-h-11 w-full sm:w-auto"
              >
                Credits / plans
              </ButtonLink>
            ) : null}
          </div>
        )}

        {error ? (
          <p
            className="min-w-0 break-words rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {info ? (
          <div
            className={cn(
              ACADEMY_SURFACE_CLASS.performance,
              "flex min-w-0 flex-col gap-2 rounded-xl px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            )}
            role="status"
          >
            <p className="min-w-0 break-words text-sm font-medium">{info}</p>
            {info === ALREADY_ENROLLED_MESSAGE ? (
              <Button
                type="button"
                className="academy-visual-cta academy-visual-cta--success min-h-11 w-full shrink-0 sm:w-auto"
                disabled={busy || !resume}
                onClick={() => {
                  if (!resume) return;
                  void onResumeCheckpoint(
                    resume.moduleId,
                    resume.lessonId,
                    Math.max(0, pathwayCounts.total - 1)
                  );
                  const el = document.getElementById("pathway-heading");
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <PlayCircle className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                Continue course
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>

      <section
        className={cn(ACADEMY_SURFACE_CLASS.catalogue, "min-w-0 space-y-3 p-4 sm:p-5")}
        aria-labelledby="pathway-heading"
      >
        <h2 id="pathway-heading" className="text-lg font-semibold">
          Learning pathway
        </h2>
        <p className="academy-visual-muted text-sm">
          {pathwayCounts.required} required · {pathwayCounts.total} activities. Resources open
          existing GigaLearn hubs/tools.
        </p>
        {!isEnrolled ? (
          <p className="academy-visual-muted inline-flex items-center gap-2 text-sm">
            <Lock className="h-4 w-4 shrink-0" aria-hidden />
            Enrol to save pathway resume checkpoints.
          </p>
        ) : null}

        <ol className="min-w-0 space-y-3">
          {course.modules.map((mod) => (
            <li key={mod.id} className="academy-visual-tile min-w-0 rounded-2xl p-4">
              <h3 className="font-semibold">{mod.title}</h3>
              <p className="academy-visual-muted mt-1 text-sm">{mod.summary}</p>
              <ul className="mt-3 min-w-0 space-y-2">
                {mod.lessons.map((lesson) => {
                  const idx = lessonIndex;
                  lessonIndex += 1;
                  const href = lesson.resource
                    ? hrefForAcademyResource(lesson.resource)
                    : siteConfig.links.gigalearn;
                  return (
                    <li
                      key={lesson.id}
                      className="flex min-w-0 flex-col gap-2 rounded-xl border border-[var(--av-border)] bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="break-words text-sm font-medium">
                          {lesson.title}
                          {lesson.required ? (
                            <span className="ml-2 text-[11px] font-semibold text-[#6D28D9]">
                              Required
                            </span>
                          ) : (
                            <span className="academy-visual-muted ml-2 text-[11px]">Optional</span>
                          )}
                        </p>
                        <p className="academy-visual-muted break-words text-xs">
                          {lesson.summary} · ~{lesson.estimatedMinutes} min · {lesson.activityKind}
                        </p>
                      </div>
                      <div className="flex min-w-0 flex-wrap gap-2">
                        <Link
                          href={href}
                          className="academy-visual-cta inline-flex min-h-11 items-center px-3 text-xs"
                        >
                          Open resource
                        </Link>
                        {isEnrolled ? (
                          <Link
                            href={`/gigalearn/?tab=tutor&academyCourse=${encodeURIComponent(slug)}&module=${encodeURIComponent(mod.id)}&lesson=${encodeURIComponent(lesson.id)}`}
                            className="academy-visual-cta inline-flex min-h-11 items-center px-3 text-xs"
                          >
                            Ask AI Tutor
                          </Link>
                        ) : null}
                        {isEnrolled ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onResumeCheckpoint(mod.id, lesson.id, idx)}
                            className="academy-visual-cta inline-flex min-h-11 items-center px-3 text-xs"
                          >
                            Mark checkpoint
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </AcademyChrome>
  );
}

export function AcademyCourseDetail() {
  return (
    <Suspense fallback={<ClientAppHydrationNotice productName="GigaLearn Academy" />}>
      <AcademyCourseDetailInner />
    </Suspense>
  );
}
