"use client";

import { AcademyChrome } from "@/components/gigalearn/academy/AcademyChrome";
import { AcademyCourseCatalogueBody } from "@/components/gigalearn/academy/AcademyCourseCatalogueBody";
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
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  Sparkles,
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
        className="saas-card rounded-2xl border border-border bg-white p-4 sm:p-5"
      >
        <h2 id="academy-summary-heading" className="text-base font-semibold text-foreground">
          Your learning summary
        </h2>
        <p className="mt-1 text-sm text-muted">
          Sign in to see enrolments, assessment history, and certificates from your account.
        </p>
        <div className="mt-4">
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
        className="saas-card rounded-2xl border border-border p-4 sm:p-5"
      >
        <h2 id="academy-summary-heading" className="text-base font-semibold text-foreground">
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

  return (
    <section
      aria-labelledby="academy-summary-heading"
      className="saas-card rounded-2xl border border-border bg-white p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="academy-summary-heading" className="text-base font-semibold text-foreground">
            Your learning summary
          </h2>
          <p className="mt-1 text-sm text-muted">
            Based on server-verified Academy data for your account only.
          </p>
        </div>
        <Link
          href="/gigalearn/academy/my/"
          className="text-sm font-semibold text-accent hover:underline"
        >
          My courses →
        </Link>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-[var(--surface,#fafafa)] p-3">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">
            Enrolments
          </dt>
          <dd className="mt-1 text-xl font-bold text-foreground">{enrolments.length}</dd>
        </div>
        <div className="rounded-xl border border-border bg-[var(--surface,#fafafa)] p-3">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">
            Assessments
          </dt>
          <dd className="mt-1 text-xl font-bold text-foreground">{attempts.length}</dd>
        </div>
        <div className="rounded-xl border border-border bg-[var(--surface,#fafafa)] p-3">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">Passed</dt>
          <dd className="mt-1 text-xl font-bold text-foreground">
            {graded.length === 0 ? "—" : passedCount}
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-[var(--surface,#fafafa)] p-3">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">
            Certificates
          </dt>
          <dd className="mt-1 text-xl font-bold text-foreground">{certificates.length}</dd>
        </div>
      </dl>

      {enrolments.length === 0 && attempts.length === 0 && certificates.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border px-3 py-3 text-sm text-muted">
          No Academy activity yet. Enrol in a course or open Practice Centre when you are ready —
          we will not invent progress for you.
        </p>
      ) : null}

      {resume && resumeTitle ? (
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-accent/25 bg-accent/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Continue</p>
            <p className="truncate text-sm font-semibold text-foreground">{resumeTitle}</p>
            <p className="text-xs text-muted">
              Pathway {resume.progressPercent}%
              {resume.lastLessonId ? ` · ${resume.lastLessonId}` : ""}
            </p>
          </div>
          <ButtonLink
            href={`/gigalearn/academy/course/?slug=${encodeURIComponent(resume.courseSlug)}`}
            className="min-h-11 shrink-0"
          >
            Resume
          </ButtonLink>
        </div>
      ) : null}
    </section>
  );
}

function PracticeCentreCard() {
  return (
    <section
      aria-labelledby="practice-centre-heading"
      className="relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/15 via-white to-white p-4 sm:p-6"
    >
      <div className="relative space-y-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-white">
          <ClipboardCheck className="h-5 w-5" aria-hidden />
        </div>
        <h2 id="practice-centre-heading" className="text-lg font-bold text-foreground sm:text-xl">
          Practice Centre
        </h2>
        <p className="max-w-xl text-sm text-muted">
          Take server-graded Academy assessments for enrolled courses, or open GigaLearn practice
          tools and the AI Tutor. No new grading engine — existing assessments and practice only.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <ButtonLink href="/gigalearn/academy/assess/" className="min-h-11">
            Academy assessments
          </ButtonLink>
          <ButtonLink href="/gigalearn/academy/my/" variant="secondary" className="min-h-11">
            My enrolled courses
          </ButtonLink>
          <ButtonLink href="/gigalearn/?tab=learn" variant="secondary" className="min-h-11">
            Student practice tools
          </ButtonLink>
          <ButtonLink href="/gigalearn/?tab=tutor" variant="secondary" className="min-h-11">
            AI Tutor
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

function LearningStudiosDirectory() {
  return (
    <section aria-labelledby="studios-heading" className="space-y-3">
      <div>
        <h2 id="studios-heading" className="text-lg font-bold text-foreground">
          Learning Studios
        </h2>
        <p className="mt-1 text-sm text-muted">
          Hands-on labs. Available studios open real GigaLearn experiences; others are marked
          coming soon.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LEARNING_STUDIOS.map((studio) => (
          <li key={studio.id}>
            <article className="saas-card flex h-full flex-col rounded-2xl border border-border bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" aria-hidden />
                {studio.status === "planned" ? (
                  <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-muted">
                    Coming soon
                  </span>
                ) : (
                  <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-foreground">
                    Available
                  </span>
                )}
              </div>
              <h3 className="mt-2 text-base font-semibold text-foreground">{studio.name}</h3>
              <p className="mt-1 flex-1 text-sm text-muted">{studio.blurb}</p>
              {studio.status === "available" && studio.href ? (
                <Link
                  href={studio.href}
                  className="mt-4 inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-accent/35 bg-accent/10 px-3 text-sm font-semibold text-foreground hover:border-accent/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {studio.ctaLabel ?? "Open"}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : (
                <p className="mt-4 min-h-11 text-sm font-medium text-muted">
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
        className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-accent/20 via-white to-violet-50 p-5 sm:p-8"
      >
        <div className="relative max-w-2xl space-y-3">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-accent">
            <GraduationCap className="h-4 w-4" aria-hidden />
            Welcome
          </p>
          <h2 id="academy-hero-heading" className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Practise, build, and learn by doing
          </h2>
          <p className="text-sm text-muted sm:text-base">
            {ACADEMY_TRANSFORM_TAGLINE} Explore Learning Studios, open the Practice Centre, and keep
            your existing Academy pathways — without inventing progress or fake tools.
          </p>
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
            <ButtonLink href="#practice-centre-heading" className="min-h-11">
              Go to Practice Centre
            </ButtonLink>
            <ButtonLink href="#existing-academy" variant="secondary" className="min-h-11">
              Browse courses
            </ButtonLink>
          </div>
        </div>
      </section>

      <PersonalLearningSummary />

      <div id="practice-centre">
        <PracticeCentreCard />
      </div>

      <LearningStudiosDirectory />

      <section id="existing-academy" aria-labelledby="existing-academy-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2
              id="existing-academy-heading"
              className="flex items-center gap-2 text-lg font-bold text-foreground"
            >
              <BookOpen className="h-5 w-5 text-accent" aria-hidden />
              Existing Academy
            </h2>
            <p className="mt-1 text-sm text-muted">
              Full course catalogue and pathways that reuse GigaLearn tools — preserved as-is.
            </p>
          </div>
          <Link
            href="/gigalearn/academy/courses/"
            className="text-sm font-semibold text-accent hover:underline"
          >
            Full catalogue page →
          </Link>
        </div>
        <AcademyCourseCatalogueBody />
      </section>
    </AcademyChrome>
  );
}
