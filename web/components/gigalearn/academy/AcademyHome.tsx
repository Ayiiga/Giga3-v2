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
import {
  learnerEventSessionKey,
  markLearnerEventFired,
} from "@/lib/gigalearn/learnerEngagement";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import {
  ArrowRight,
  Award,
  Baby,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  MessageCircle,
  School,
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
      className={cn(ACADEMY_SURFACE_CLASS.dashboard, "min-w-0 p-4 sm:p-5")}
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 id="academy-summary-heading" className="text-base font-semibold">
            Your learning summary
          </h2>
          <p className="academy-visual-muted mt-1 text-sm">
            Based on server-verified Academy data for your account only.
          </p>
        </div>
        <Link
          href="/gigalearn/academy/my/"
          className="shrink-0 text-sm font-semibold underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          My courses →
        </Link>
      </div>

      <div className="mt-4 grid min-w-0 gap-3">
        <dl className="academy-visual-stat-grid">
          <div className="academy-visual-tile rounded-xl p-3">
            <dt className="academy-visual-stat-label academy-visual-muted">Enrolments</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums">{enrolments.length}</dd>
          </div>
          <div
            className={cn(ACADEMY_SURFACE_CLASS.performance, "min-w-0 rounded-xl p-3")}
            aria-label="Assessment performance"
          >
            <dt className="academy-visual-stat-label academy-visual-muted">Assessments</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums">{attempts.length}</dd>
          </div>
          <div
            className={cn(ACADEMY_SURFACE_CLASS.performance, "min-w-0 rounded-xl p-3")}
            aria-label="Passed assessments"
          >
            <dt className="academy-visual-stat-label academy-visual-muted">Passed</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums">
              {graded.length === 0 ? 0 : passedCount}
            </dd>
          </div>
          <div
            className={cn(ACADEMY_SURFACE_CLASS.certificates, "min-w-0 rounded-xl p-3")}
            aria-label="Certificates earned"
          >
            <dt className="academy-visual-stat-label academy-visual-muted flex items-center gap-1">
              <Award className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>Certificates</span>
            </dt>
            <dd className="mt-1 text-xl font-bold tabular-nums">{certificates.length}</dd>
          </div>
        </dl>

        {resume && resumeTitle ? (
          <article className="academy-visual-course-card">
            <div className="academy-visual-course-card__body">
              <LearningProgressRing
                percent={progressPercent}
                size={56}
                label={`${resumeTitle} ${progressPercent}% complete`}
              />
              <div className="academy-visual-course-card__copy">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6D28D9]">
                  Continue learning
                </p>
                <p className="text-base font-bold leading-snug text-[#1E1B4B]">{resumeTitle}</p>
                <p className="academy-visual-muted mt-1 text-xs">
                  Pathway {progressPercent}%
                  {resume.lastLessonId ? ` · ${resume.lastLessonId}` : ""}
                </p>
                <div className="academy-visual-progress-track mt-2 w-full max-w-full">
                  <div
                    className="academy-visual-progress-fill"
                    style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
                  />
                </div>
              </div>
            </div>
            <ButtonLink
              href={`/gigalearn/academy/course/?slug=${encodeURIComponent(resume.courseSlug)}`}
              className="academy-visual-cta academy-visual-cta--success min-h-11 w-full shrink-0 sm:w-auto"
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

/**
 * Primary school pathways — Learn tab opens Academy, so Early years / Basic school
 * must stay visible here (they live on the GigaLearn Student hub).
 */
function SchoolPathways() {
  return (
    <section
      aria-labelledby="school-pathways-heading"
      className="space-y-3"
      data-testid="academy-school-pathways"
    >
      <div>
        <h2 id="school-pathways-heading" className="text-lg font-bold text-[#1E1B4B]">
          Early years &amp; Basic school
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Start by age or grade — concrete Early years activities, then Basic school subjects and
          lessons on the Student hub.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        <li>
          <Link
            href="/gigalearn/?tab=early-years"
            className="academy-visual-quick academy-visual-quick--early"
            data-testid="academy-pathway-early-years"
          >
            <Baby className="h-5 w-5 shrink-0" aria-hidden />
            <span>
              Early years
              <span className="mt-1 block text-xs font-medium text-white/85">
                Creche · KG1 · KG2 · real-object learning
              </span>
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/gigalearn/?tab=learn"
            className="academy-visual-quick academy-visual-quick--basic"
            data-testid="academy-pathway-basic-school"
          >
            <School className="h-5 w-5 shrink-0" aria-hidden />
            <span>
              Basic school
              <span className="mt-1 block text-xs font-medium text-white/85">
                P1–JHS subjects, lessons, and quizzes
              </span>
            </span>
          </Link>
        </li>
      </ul>
      <p className="text-xs text-slate-600">
        Also in the Academy menu above: <span className="font-semibold">Early years</span> and{" "}
        <span className="font-semibold">Basic school</span>.
      </p>
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

function LearnerNextSteps() {
  const sessionToken = getSessionToken();
  const recordEvent = useMutation(api.gigaLearnEngagement.recordLearnerEvent);
  const next = useQuery(
    api.gigaLearnEngagement.listMyNextSteps,
    sessionToken ? { sessionToken, limit: 6 } : "skip"
  );

  if (!sessionToken && !hasPersistedAuth()) return null;
  if (next === undefined) {
    return (
      <section aria-labelledby="next-steps-heading" className="space-y-2">
        <h2 id="next-steps-heading" className="text-lg font-bold text-foreground">
          Your next steps
        </h2>
        <ClientAppHydrationNotice productName="GigaLearn Academy" />
      </section>
    );
  }
  if (next.steps.length === 0) return null;

  return (
    <section aria-labelledby="next-steps-heading" className="space-y-3">
      <div>
        <h2 id="next-steps-heading" className="text-lg font-bold text-foreground">
          Your next steps
        </h2>
        <p className="mt-1 text-sm text-muted">
          From your enrolments, unlocked assessments, and practice topics that need reassessment —
          not invented recommendations.
        </p>
      </div>
      <ul className="space-y-2">
        {next.steps.map((step) => (
          <li key={`${step.kind}:${step.href}`}>
            <Link
              href={step.href}
              className="saas-card flex flex-col gap-1 rounded-2xl border border-border p-3 hover:border-accent/35 sm:flex-row sm:items-center sm:justify-between"
              onClick={() => {
                if (!sessionToken || step.kind !== "resume_course") return;
                const key = learnerEventSessionKey("resume_course_click", step.courseSlug ?? "");
                if (!markLearnerEventFired(key)) return;
                void recordEvent({
                  sessionToken,
                  event: "resume_course_click",
                }).catch(() => undefined);
              }}
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  {step.kind === "resume_course"
                    ? "Continue course"
                    : step.kind === "take_assessment"
                      ? "Take assessment"
                      : "Revise weakness"}
                </p>
                <p className="font-semibold text-foreground">{step.title}</p>
                <p className="text-xs text-muted">{step.detail}</p>
              </div>
              <span className="text-sm font-semibold text-accent">Open →</span>
            </Link>
          </li>
        ))}
      </ul>
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
  const sessionToken = getSessionToken();
  const recordEvent = useMutation(api.gigaLearnEngagement.recordLearnerEvent);

  useEffect(() => {
    if (!sessionToken) return;
    const key = learnerEventSessionKey("academy_home_open");
    if (!markLearnerEventFired(key)) return;
    void recordEvent({ sessionToken, event: "academy_home_open" }).catch(() => undefined);
  }, [sessionToken, recordEvent]);

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

      <SchoolPathways />

      <PersonalLearningSummary />

      <LearnerNextSteps />

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
