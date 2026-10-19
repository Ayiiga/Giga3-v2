"use client";

import { AcademyChrome } from "@/components/gigalearn/academy/AcademyChrome";
import { AcademyCourseCatalogueBody } from "@/components/gigalearn/academy/AcademyCourseCatalogueBody";
import { LearningProgressRing } from "@/components/gigalearn/ui/LearningProgressRing";
import { ButtonLink } from "@/components/ui/Button";
import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSignInPrompt } from "@/components/seo/ProductSignInPrompt";
import { getSessionToken } from "@/lib/auth";
import { hasPersistedAuth } from "@/lib/auth/sessionRestore";
import { getBuiltinAcademyCourse } from "@/lib/gigalearn/academy/courseCatalog";
import {
  ACADEMY_TRANSFORM_TAGLINE,
  LEARNING_STUDIOS,
} from "@/lib/gigalearn/academy/learningStudios";
import {
  ACADEMY_SURFACE_CLASS,
  studioThemeClass,
} from "@/lib/gigalearn/academy/visualTheme";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  Award,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  MessageCircle,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";

function PersonalLearningSummary() {
  const sessionToken = getSessionToken();
  const enrolments = useQuery(
    api.gigaLearnAcademy.listMyEnrolments,
    sessionToken ? { sessionToken } : "skip"
  );
  const attempts = useQuery(
    api.gigaLearnAcademyAssessments.listMyAssessmentHistory,
    sessionToken ? { sessionToken } : "skip"
  );
  const certificates = useQuery(
    api.gigaLearnAcademyCertificates.listMyCertificates,
    sessionToken ? { sessionToken } : "skip"
  );

  if (!sessionToken && !hasPersistedAuth()) {
    return (
      <section
        aria-labelledby="academy-summary-heading"
        className={cn(ACADEMY_SURFACE_CLASS.dashboard, "p-4 sm:p-5")}
      >
        <h2 id="academy-summary-heading" className="text-base font-semibold">
          Your learning summary
        </h2>
        <p className="academy-visual-muted mt-1 text-sm">
          Sign in to see enrolments, assessment history, and certificates from your account.
        </p>
        <div className="mt-4 rounded-xl border border-[var(--av-border)] bg-[var(--av-surface)] p-3">
          <ProductSignInPrompt
            productName="GigaLearn Academy"
            description="Your progress stays private to your signed-in account."
            nextPath="/gigalearn/academy/"
          />
        </div>
      </section>
    );
  }

  if (
    enrolments === undefined ||
    attempts === undefined ||
    certificates === undefined
  ) {
    return (
      <section
        aria-labelledby="academy-summary-heading"
        className={cn(ACADEMY_SURFACE_CLASS.dashboard, "p-4 sm:p-5")}
      >
        <h2 id="academy-summary-heading" className="text-base font-semibold">
          Your learning summary
        </h2>
        <ClientAppHydrationNotice productName="GigaLearn Academy" />
      </section>
    );
  }

  const activeEnrolments = enrolments.filter(
    (e: { status: string }) => e.status === "active"
  );
  const resume =
    activeEnrolments.find((e: { lastLessonId?: string | null }) => e.lastLessonId) ??
    activeEnrolments[0];
  const resumeTitle = resume
    ? getBuiltinAcademyCourse(resume.courseSlug)?.title ?? resume.courseSlug
    : null;
  const graded = attempts.filter((a: { score?: number | null }) => a.score != null);
  const passedCount = graded.filter((a: { passed?: boolean | null }) => a.passed).length;
  const progressPercent =
    typeof resume?.progressPercent === "number" ? resume.progressPercent : 0;

  return (
    <section
      aria-labelledby="academy-summary-heading"
      className={cn(ACADEMY_SURFACE_CLASS.dashboard, "p-4 sm:p-5")}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="academy-summary-heading" className="text-base font-semibold">
            Your learning summary
          </h2>
          <p className="academy-visual-muted mt-1 text-sm">
            Based on server-verified Academy data for your account only.
          </p>
        </div>
        <Link
          href="/gigalearn/academy/my/"
          className="text-sm font-semibold underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          My courses →
        </Link>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          <div className="academy-visual-tile rounded-xl p-3">
            <dt className="academy-visual-muted text-[11px] font-medium uppercase tracking-wide">
              Enrolments
            </dt>
            <dd className="mt-1 text-xl font-bold">{enrolments.length}</dd>
          </div>
          <div
            className={cn(ACADEMY_SURFACE_CLASS.performance, "rounded-xl p-3")}
            aria-label="Assessment performance"
          >
            <dt className="academy-visual-muted text-[11px] font-medium uppercase tracking-wide">
              Assessments
            </dt>
            <dd className="mt-1 text-xl font-bold">{attempts.length}</dd>
          </div>
          <div
            className={cn(ACADEMY_SURFACE_CLASS.performance, "rounded-xl p-3")}
            aria-label="Passed assessments"
          >
            <dt className="academy-visual-muted text-[11px] font-medium uppercase tracking-wide">
              Passed
            </dt>
            <dd className="mt-1 text-xl font-bold">
              {graded.length === 0 ? "—" : passedCount}
            </dd>
          </div>
          <div
            className={cn(ACADEMY_SURFACE_CLASS.certificates, "rounded-xl p-3")}
            aria-label="Certificates earned"
          >
            <dt className="academy-visual-muted flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide">
              <Award className="h-3.5 w-3.5" aria-hidden />
              Certificates
            </dt>
            <dd className="mt-1 text-xl font-bold">{certificates.length}</dd>
          </div>
        </dl>

        {resume && resumeTitle ? (
          <article className="academy-visual-course-card">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <LearningProgressRing
                percent={progressPercent}
                label={`${resumeTitle} ${progressPercent}% complete`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6D28D9]">
                  Continue learning
                </p>
                <p className="truncate text-base font-bold text-[#1E1B4B]">{resumeTitle}</p>
                <p className="academy-visual-muted mt-1 text-xs">
                  Pathway {progressPercent}%
                  {resume.lastLessonId ? ` · ${resume.lastLessonId}` : ""}
                </p>
                <div className="academy-visual-progress-track mt-2 max-w-xs">
                  <div
                    className="academy-visual-progress-fill"
                    style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
                  />
                </div>
              </div>
            </div>
            <ButtonLink
              href={`/gigalearn/academy/course/?slug=${encodeURIComponent(resume.courseSlug)}`}
              className="academy-visual-cta academy-visual-cta--success min-h-11 shrink-0"
            >
              Continue
            </ButtonLink>
          </article>
        ) : null}
      </div>

      {enrolments.length === 0 && attempts.length === 0 && certificates.length === 0 ? (
        <p className="academy-visual-tile academy-visual-muted mt-4 rounded-xl border-dashed px-3 py-3 text-sm">
          No Academy activity yet. Enrol in a course or open Practice Centre when you are ready —
          we will not invent progress for you.
        </p>
      ) : null}

      <div className="mt-4">
        <Link
          href="/gigalearn/academy/certificates/"
          className={cn(
            ACADEMY_SURFACE_CLASS.certificates,
            "academy-visual-cta flex w-full sm:w-auto"
          )}
        >
          View certificates
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

function QuickActions() {
  return (
    <section aria-labelledby="quick-actions-heading" className="space-y-3">
      <div>
        <h2 id="quick-actions-heading" className="text-lg font-bold text-[#1E1B4B]">
          Jump back in
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Colourful shortcuts to real Academy and Exam Practice destinations — no invented tools.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="#practice-centre" className="academy-visual-quick academy-visual-quick--practice">
          <ClipboardCheck className="h-5 w-5" aria-hidden />
          <span>
            Practice Centre
            <span className="mt-1 block text-xs font-medium text-white/85">Assessments & tools</span>
          </span>
        </Link>
        <Link href="/gigalearn/exam/" className="academy-visual-quick academy-visual-quick--exam">
          <Target className="h-5 w-5" aria-hidden />
          <span>
            Exam Practice
            <span className="mt-1 block text-xs font-medium text-white/85">BECE & Promotion</span>
          </span>
        </Link>
        <Link href="/gigalearn/?tab=tutor" className="academy-visual-quick academy-visual-quick--tutor">
          <MessageCircle className="h-5 w-5" aria-hidden />
          <span>
            AI Tutor
            <span className="mt-1 block text-xs font-medium text-white/85">Guided help</span>
          </span>
        </Link>
        <Link
          href="/gigalearn/academy/certificates/"
          className="academy-visual-quick academy-visual-quick--certs"
        >
          <Award className="h-5 w-5" aria-hidden />
          <span>
            Certificates
            <span className="mt-1 block text-xs font-medium text-white/85">Verify & share</span>
          </span>
        </Link>
      </div>
    </section>
  );
}

function PracticeCentreCard() {
  return (
    <section
      aria-labelledby="practice-centre-heading"
      className={cn(ACADEMY_SURFACE_CLASS.practice, "relative overflow-hidden p-4 sm:p-6")}
    >
      <div className="relative space-y-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--av-border)] bg-[var(--av-surface)]"
          aria-hidden
        >
          <ClipboardCheck className="h-5 w-5" />
        </div>
        <h2 id="practice-centre-heading" className="text-lg font-bold sm:text-xl">
          Practice Centre
        </h2>
        <p className="academy-visual-muted max-w-xl text-sm">
          Take server-graded Academy assessments for enrolled courses, or open GigaLearn practice
          tools and the AI Tutor. No new grading engine — existing assessments and practice only.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href="/gigalearn/academy/assess/" className="academy-visual-cta academy-visual-cta--solid">
            Academy assessments
          </Link>
          <Link href="/gigalearn/academy/my/" className="academy-visual-cta academy-visual-cta--ghost">
            My enrolled courses
          </Link>
          <Link href="/gigalearn/?tab=learn" className="academy-visual-cta academy-visual-cta--ghost">
            Student practice tools
          </Link>
          <Link href="/gigalearn/?tab=tutor" className="academy-visual-cta academy-visual-cta--ghost">
            AI Tutor
          </Link>
          <Link href="/gigalearn/exam/" className="academy-visual-cta academy-visual-cta--ghost">
            Exam Practice Centre
          </Link>
        </div>
      </div>
    </section>
  );
}

function LearningStudiosDirectory() {
  return (
    <section aria-labelledby="studios-heading" className="space-y-3">
      <div>
        <h2 id="studios-heading" className="text-lg font-bold text-[#1E1B4B]">
          Learning Studios
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Hands-on labs with distinct studio colours. Available studios open real GigaLearn
          experiences; others are labelled coming soon (not colour-only).
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LEARNING_STUDIOS.map((studio) => (
          <li key={studio.id}>
            <article
              className={cn(
                studioThemeClass(studio.id),
                "flex h-full flex-col p-4"
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                {studio.status === "planned" ? (
                  <span className="academy-visual-chip rounded-full px-2 py-0.5 text-[11px] font-semibold">
                    Coming soon
                  </span>
                ) : (
                  <span className="academy-visual-chip rounded-full px-2 py-0.5 text-[11px] font-semibold">
                    Available
                  </span>
                )}
              </div>
              <h3 className="mt-2 text-base font-semibold">{studio.name}</h3>
              <p className="academy-visual-muted mt-1 flex-1 text-sm">{studio.blurb}</p>
              {studio.status === "available" && studio.href ? (
                <Link
                  href={studio.href}
                  className={cn(
                    "academy-visual-cta mt-4",
                    studio.id === "giga-ai"
                      ? "academy-visual-cta--solid"
                      : undefined
                  )}
                >
                  {studio.ctaLabel ?? "Open"}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : (
                <p className="academy-visual-muted mt-4 min-h-11 text-sm font-medium">
                  Planned — not available yet
                </p>
              )}
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AcademyHome() {
  return (
    <AcademyChrome
      active="home"
      title="GigaLearn Academy"
      subtitle={ACADEMY_TRANSFORM_TAGLINE}
    >
      <section
        aria-labelledby="academy-hero-heading"
        className={cn(ACADEMY_SURFACE_CLASS.hero, "relative overflow-hidden p-5 sm:p-8")}
      >
        <div className="relative max-w-2xl space-y-3">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white">
            <GraduationCap className="h-4 w-4" aria-hidden />
            Welcome
          </p>
          <h2
            id="academy-hero-heading"
            className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
          >
            Hello, learner — practise, build, and learn by doing
          </h2>
          <p className="academy-visual-muted text-sm sm:text-base">
            {ACADEMY_TRANSFORM_TAGLINE} Explore Learning Studios, open the Practice Centre, and keep
            your existing Academy pathways — without inventing progress or fake tools.
          </p>
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
            <Link
              href="#practice-centre"
              className="academy-visual-cta academy-visual-cta--solid"
            >
              Go to Practice Centre
            </Link>
            <Link href="#existing-academy" className="academy-visual-cta academy-visual-cta--ghost">
              Browse courses
            </Link>
          </div>
        </div>
      </section>

      <PersonalLearningSummary />

      <QuickActions />

      <div id="practice-centre">
        <PracticeCentreCard />
      </div>

      <LearningStudiosDirectory />

      <section
        id="existing-academy"
        aria-labelledby="existing-academy-heading"
        className={cn(ACADEMY_SURFACE_CLASS.catalogue, "space-y-3 p-4 sm:p-5")}
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2
              id="existing-academy-heading"
              className="flex items-center gap-2 text-lg font-bold"
            >
              <BookOpen className="h-5 w-5" aria-hidden />
              Existing Academy
            </h2>
            <p className="academy-visual-muted mt-1 text-sm">
              Full course catalogue and pathways that reuse GigaLearn tools — preserved as-is.
            </p>
          </div>
          <Link
            href="/gigalearn/academy/courses/"
            className="text-sm font-semibold text-[#4C1D95] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4C1D95]"
          >
            Full catalogue page →
          </Link>
        </div>
        <AcademyCourseCatalogueBody />
      </section>
    </AcademyChrome>
  );
}
