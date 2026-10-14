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
import { hrefForAcademyResource } from "@/lib/gigalearn/academy/resourceLinks";
import { siteConfig } from "@/lib/site";
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
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const result = await enrol({ sessionToken, courseSlug: slug });
      setInfo(
        result.reactivated
          ? "Enrolment reactivated. You can resume your pathway."
          : "Enrolled successfully. Start with the first module below."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enrolment failed.");
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
      <section className="saas-card space-y-4 rounded-2xl border border-border p-4 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold">
            {accessBadge(course.access, course.creditCost)}
          </span>
          {course.certificateEligible ? (
            <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted">
              Certificate eligibility configured (issuance in a later phase)
            </span>
          ) : null}
          {enrolment ? (
            <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted">
              {enrolment.status} · {enrolment.progressPercent}% pathway
            </span>
          ) : null}
        </div>

        <p className="text-sm leading-relaxed text-muted">{course.description}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Learning objectives</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
              {course.learningObjectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Prerequisites</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
              {course.prerequisites.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid gap-3 text-sm text-muted sm:grid-cols-2">
          <p>
            <span className="font-semibold text-foreground">Curriculum preview: </span>
            {course.curriculumPreview}
          </p>
          <p>
            <span className="font-semibold text-foreground">Assessment: </span>
            {course.assessmentDescription}
          </p>
          <p>
            <span className="font-semibold text-foreground">Completion: </span>
            {course.completionRequirements}
          </p>
          {course.instructorName ? (
            <p>
              <span className="font-semibold text-foreground">Instructor: </span>
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
          <div className="flex flex-wrap gap-3">
            {!isEnrolled ? (
              <Button
                type="button"
                className="min-h-11"
                disabled={busy || !sessionToken}
                onClick={() => void onEnrol()}
              >
                {busy ? "Enrolling…" : "Enrol in course"}
              </Button>
            ) : (
              <>
                <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-3 text-sm font-semibold text-foreground">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  Enrolled
                </span>
                {resume ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    disabled={busy}
                    onClick={() =>
                      void onResumeCheckpoint(
                        resume.moduleId,
                        resume.lessonId,
                        Math.max(0, pathwayCounts.total - 1)
                      )
                    }
                  >
                    <PlayCircle className="mr-2 h-4 w-4" aria-hidden />
                    Resume learning
                  </Button>
                ) : null}
              </>
            )}
            <ButtonLink href="/gigalearn/academy/my/" variant="outline" className="min-h-11">
              My courses
            </ButtonLink>
            {isEnrolled ? (
              <ButtonLink
                href={`/gigalearn/academy/assess/?course=${encodeURIComponent(slug)}`}
                variant="outline"
                className="min-h-11"
              >
                Assessments
              </ButtonLink>
            ) : null}
            {isEnrolled && course.certificateEligible ? (
              <ButtonLink
                href={`/gigalearn/academy/certificates/?course=${encodeURIComponent(slug)}`}
                variant="outline"
                className="min-h-11"
              >
                Certificates
              </ButtonLink>
            ) : null}
            {course.access !== "free" ? (
              <ButtonLink href={siteConfig.links.credits} variant="outline" className="min-h-11">
                Credits / plans
              </ButtonLink>
            ) : null}
          </div>
        )}

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}
        {info ? (
          <p className="rounded-xl border border-accent/25 bg-accent/5 px-3 py-2 text-sm text-foreground">
            {info}
          </p>
        ) : null}
      </section>

      <section className="space-y-3" aria-labelledby="pathway-heading">
        <h2 id="pathway-heading" className="text-lg font-semibold text-foreground">
          Learning pathway
        </h2>
        <p className="text-sm text-muted">
          {pathwayCounts.required} required · {pathwayCounts.total} activities. Resources open
          existing GigaLearn hubs/tools.
        </p>
        {!isEnrolled ? (
          <p className="inline-flex items-center gap-2 text-sm text-muted">
            <Lock className="h-4 w-4" aria-hidden />
            Enrol to save pathway resume checkpoints.
          </p>
        ) : null}

        <ol className="space-y-3">
          {course.modules.map((mod) => (
            <li key={mod.id} className="saas-card rounded-2xl border border-border p-4">
              <h3 className="font-semibold text-foreground">{mod.title}</h3>
              <p className="mt-1 text-sm text-muted">{mod.summary}</p>
              <ul className="mt-3 space-y-2">
                {mod.lessons.map((lesson) => {
                  const idx = lessonIndex;
                  lessonIndex += 1;
                  const href = lesson.resource
                    ? hrefForAcademyResource(lesson.resource)
                    : siteConfig.links.gigalearn;
                  return (
                    <li
                      key={lesson.id}
                      className="flex flex-col gap-2 rounded-xl border border-border/80 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {lesson.title}
                          {lesson.required ? (
                            <span className="ml-2 text-[11px] font-semibold text-accent">Required</span>
                          ) : (
                            <span className="ml-2 text-[11px] text-muted">Optional</span>
                          )}
                        </p>
                        <p className="text-xs text-muted">
                          {lesson.summary} · ~{lesson.estimatedMinutes} min · {lesson.activityKind}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={href}
                          className="inline-flex min-h-11 items-center rounded-xl border border-border px-3 text-xs font-semibold text-foreground hover:border-accent/30"
                        >
                          Open resource
                        </Link>
                        {isEnrolled ? (
                          <Link
                            href={`/gigalearn/?tab=tutor&academyCourse=${encodeURIComponent(slug)}&module=${encodeURIComponent(mod.id)}&lesson=${encodeURIComponent(lesson.id)}`}
                            className="inline-flex min-h-11 items-center rounded-xl border border-accent/30 bg-accent/10 px-3 text-xs font-semibold text-foreground"
                          >
                            Ask AI Tutor
                          </Link>
                        ) : null}
                        {isEnrolled ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onResumeCheckpoint(mod.id, lesson.id, idx)}
                            className="inline-flex min-h-11 items-center rounded-xl border border-accent/30 bg-accent/10 px-3 text-xs font-semibold text-foreground"
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
