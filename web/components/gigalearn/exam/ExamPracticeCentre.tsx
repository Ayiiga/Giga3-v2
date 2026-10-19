"use client";

import { ButtonLink } from "@/components/ui/Button";
import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSignInPrompt } from "@/components/seo/ProductSignInPrompt";
import { getSessionToken } from "@/lib/auth";
import { hasPersistedAuth } from "@/lib/auth/sessionRestore";
import {
  BECE_AWAITING_MATERIALS_MESSAGE,
  BECE_SUBJECTS_AVAILABLE,
  EXAM_PRACTICE_CENTRE_TAGLINE,
  EXAM_PRACTICE_CENTRE_TITLE,
  EXAM_PRACTICE_DESTINATIONS,
  TEACHER_PROMOTION_LEVEL_LABELS,
  TEACHER_PROMOTION_SOURCE_INVENTORY,
  answerStatusLabel,
} from "@/lib/gigalearn/examPractice/centreConfig";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  GraduationCap,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const EXAM_NAV = [
  { href: "/gigalearn/exam/", label: "Exam Practice", key: "exam" as const },
  { href: EXAM_PRACTICE_DESTINATIONS.academy, label: "Academy", key: "academy" as const },
  { href: EXAM_PRACTICE_DESTINATIONS.academyMy, label: "My courses", key: "my" as const },
  {
    href: EXAM_PRACTICE_DESTINATIONS.academyAssess,
    label: "Assessments",
    key: "assess" as const,
  },
  { href: EXAM_PRACTICE_DESTINATIONS.aiTutor, label: "AI Tutor", key: "tutor" as const },
  { href: EXAM_PRACTICE_DESTINATIONS.gigalearnHome, label: "GigaLearn hubs", key: null },
] as const;

function ExamPracticeChrome({ children }: { children: ReactNode }) {
  return (
    <div className="gigalearn-stable document-compact mx-auto max-w-6xl space-y-4 pb-[calc(var(--primary-nav-offset,0px)+1rem)]">
      <header className="space-y-3">
        <Link
          href={EXAM_PRACTICE_DESTINATIONS.gigalearnHome}
          className="inline-flex min-h-9 items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to GigaLearn
        </Link>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <ClipboardList className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              GigaLearn
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {EXAM_PRACTICE_CENTRE_TITLE}
            </h2>
            <p className="mt-1 text-sm text-muted">{EXAM_PRACTICE_CENTRE_TAGLINE}</p>
          </div>
        </div>
        <nav aria-label="Exam Practice and Academy" className="relative -mx-1">
          <div className="gigalearn-grade-scroll flex gap-2 overflow-x-auto px-1 pb-1">
            {EXAM_NAV.map((item) => {
              const isActive = item.key === "exam";
              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className={cn(
                    "min-h-11 shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold",
                    isActive
                      ? "border-accent/40 bg-accent/10 text-foreground"
                      : "border-border bg-white text-muted hover:border-accent/25"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
      {children}
    </div>
  );
}

function BeceCentreCard() {
  const hasSubjects = BECE_SUBJECTS_AVAILABLE.length > 0;

  return (
    <section
      id="bece-centre"
      aria-labelledby="bece-centre-heading"
      className="saas-card rounded-2xl border border-border bg-white p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <GraduationCap className="h-5 w-5 text-accent" aria-hidden />
        <h2 id="bece-centre-heading" className="text-lg font-bold text-foreground">
          BECE Mock Examination Centre
        </h2>
        <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-semibold text-muted">
          Awaiting sources
        </span>
      </div>
      <p className="mt-2 text-sm text-muted">
        Practise by subject, review mistakes, and prepare for BECE — using verified papers only when
        they are available. Teacher-promotion materials are never shown here.
      </p>

      <div
        className="mt-4 rounded-xl border border-dashed border-border bg-[var(--surface,#fafafa)] px-3 py-4"
        role="status"
        data-testid="bece-awaiting-materials"
      >
        <p className="text-sm font-semibold text-foreground">{BECE_AWAITING_MATERIALS_MESSAGE}</p>
        <p className="mt-1 text-xs text-muted">
          No BECE examination papers were identified in the current source set. Subjects and mock
          sets will appear here after verified materials are imported and reviewed.
        </p>
      </div>

      {!hasSubjects ? (
        <ul
          className="mt-3 hidden"
          aria-hidden
          data-testid="bece-subjects-slot"
          data-ready="false"
        />
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2" data-testid="bece-subjects-slot">
          {BECE_SUBJECTS_AVAILABLE.map((s) => (
            <li
              key={s.id}
              className="rounded-xl border border-border px-3 py-2 text-sm text-foreground"
            >
              {s.label}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Related study tools (not official BECE papers)
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <ButtonLink
            href={EXAM_PRACTICE_DESTINATIONS.studentLearn}
            variant="secondary"
            className="min-h-11"
          >
            Student Learn (AI practice)
          </ButtonLink>
          <ButtonLink
            href={EXAM_PRACTICE_DESTINATIONS.aiTutor}
            variant="secondary"
            className="min-h-11"
          >
            Ask AI Tutor
          </ButtonLink>
        </div>
        <p className="text-xs text-muted">
          AI-generated practice is labelled separately and is not an official WAEC/BECE paper bank.
        </p>
      </div>
    </section>
  );
}

function TeacherPromotionCentreCard() {
  return (
    <section
      id="teacher-promotion-centre"
      aria-labelledby="teacher-promotion-heading"
      className="saas-card rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-white to-white p-4 sm:p-5"
      data-testid="teacher-promotion-centre"
    >
      <div className="flex flex-wrap items-center gap-2">
        <BookOpen className="h-5 w-5 text-accent" aria-hidden />
        <h2 id="teacher-promotion-heading" className="text-lg font-bold text-foreground">
          Ghana Teacher Promotion Practice
        </h2>
        <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-foreground">
          Sources identified
        </span>
      </div>
      <p className="mt-2 text-sm text-muted">
        Prepare for Ghana Education Service promotion aptitude practice. Source-derived question
        banks are not published until review. Separate from BECE student papers.
      </p>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Promotion levels (from GES advert metadata)
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {TEACHER_PROMOTION_LEVEL_LABELS.map((level) => (
            <li
              key={level.id}
              className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground"
            >
              {level.label}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">
          Levels are labels only — no rank-specific mock is unlocked until a reviewed bank is
          published for that rank.
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Source inventory (not yet imported)
        </p>
        <ul className="mt-2 space-y-2">
          {TEACHER_PROMOTION_SOURCE_INVENTORY.map((src) => (
            <li key={src.id} className="text-sm text-foreground">
              <span className="font-medium">{src.title}</span>
              <span className="mt-0.5 block text-xs text-muted">
                {answerStatusLabel(src.answerStatus)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted" data-testid="promotion-bank-pending">
          Reviewed import is a later phase. Answer keys are not treated as verified until review.
        </p>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Available now (AI practice — not source papers)
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <ButtonLink href={EXAM_PRACTICE_DESTINATIONS.teacherHub} className="min-h-11">
            Teacher hub tools
          </ButtonLink>
          <ButtonLink
            href={EXAM_PRACTICE_DESTINATIONS.aiTutor}
            variant="secondary"
            className="min-h-11"
          >
            AI Tutor
          </ButtonLink>
          <ButtonLink
            href={EXAM_PRACTICE_DESTINATIONS.academyAssess}
            variant="secondary"
            className="min-h-11"
          >
            Academy assessments
          </ButtonLink>
        </div>
        <p className="text-xs text-muted">
          Distinguishes AI-generated practice from source-derived questions (pending) and verified
          keys (none published yet).
        </p>
      </div>
    </section>
  );
}

function AiStudyTutorCard() {
  return (
    <section
      id="ai-study-tutor"
      aria-labelledby="ai-tutor-heading"
      className="saas-card rounded-2xl border border-border bg-white p-4 sm:p-5"
      data-testid="ai-study-tutor"
    >
      <div className="flex flex-wrap items-center gap-2">
        <MessageCircle className="h-5 w-5 text-accent" aria-hidden />
        <h2 id="ai-tutor-heading" className="text-lg font-bold text-foreground">
          AI Study Tutor
        </h2>
      </div>
      <p className="mt-2 text-sm text-muted">
        Use the existing GigaLearn AI Tutor to explain topics, walk through similar practice, and
        plan revision. The tutor does not replace verified examination answer keys.
      </p>
      <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted">
        <li>Explain a question or concept</li>
        <li>Why an answer might be correct or incorrect</li>
        <li>Similar practice (AI-generated, not official papers)</li>
        <li>What to revise next from your real progress</li>
      </ul>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <ButtonLink href={EXAM_PRACTICE_DESTINATIONS.aiTutor} className="min-h-11">
          Open AI Tutor
        </ButtonLink>
        <ButtonLink
          href={EXAM_PRACTICE_DESTINATIONS.revision}
          variant="secondary"
          className="min-h-11"
        >
          Revision centre
        </ButtonLink>
      </div>
    </section>
  );
}

function MyPerformanceCard() {
  const sessionToken = getSessionToken();
  const progress = useQuery(
    api.gigaLearnProgress.listProgress,
    sessionToken ? { sessionToken, limit: 20 } : "skip"
  );
  const enrolments = useQuery(
    api.gigaLearnAcademy.listMyEnrolments,
    sessionToken ? { sessionToken } : "skip"
  );
  const attempts = useQuery(
    api.gigaLearnAcademyAssessments.listMyAssessmentHistory,
    sessionToken ? { sessionToken } : "skip"
  );

  if (!sessionToken && !hasPersistedAuth()) {
    return (
      <section
        id="my-performance"
        aria-labelledby="performance-heading"
        className="saas-card rounded-2xl border border-border bg-white p-4 sm:p-5"
        data-testid="my-performance"
      >
        <h2 id="performance-heading" className="text-lg font-bold text-foreground">
          My Performance
        </h2>
        <p className="mt-2 text-sm text-muted">
          Sign in to see your real GigaLearn practice and Academy assessment history. We do not
          invent scores or streaks.
        </p>
        <div className="mt-4">
          <ProductSignInPrompt
            productName="GigaLearn Exam Practice"
            description="Performance data stays private to your signed-in account."
            nextPath="/gigalearn/exam/"
          />
        </div>
      </section>
    );
  }

  if (progress === undefined || enrolments === undefined || attempts === undefined) {
    return (
      <section
        id="my-performance"
        aria-labelledby="performance-heading"
        className="saas-card rounded-2xl border border-border p-4 sm:p-5"
        data-testid="my-performance"
      >
        <h2 id="performance-heading" className="text-lg font-bold text-foreground">
          My Performance
        </h2>
        <ClientAppHydrationNotice productName="GigaLearn Exam Practice" />
      </section>
    );
  }

  const topicsWithScores = progress.filter(
    (r: { lastScore?: number | null }) => r.lastScore != null
  );
  const recent = progress.slice(0, 5);

  return (
    <section
      id="my-performance"
      aria-labelledby="performance-heading"
      className="saas-card rounded-2xl border border-border bg-white p-4 sm:p-5"
      data-testid="my-performance"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="performance-heading" className="text-lg font-bold text-foreground">
            My Performance
          </h2>
          <p className="mt-1 text-sm text-muted">
            Server-verified practice topics and Academy assessments for your account only.
          </p>
        </div>
        <Link
          href={EXAM_PRACTICE_DESTINATIONS.academyMy}
          className="text-sm font-semibold text-accent hover:underline"
        >
          My courses →
        </Link>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border p-3">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">
            Practice topics
          </dt>
          <dd className="mt-1 text-xl font-bold text-foreground">{progress.length}</dd>
        </div>
        <div className="rounded-xl border border-border p-3">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">
            Scored topics
          </dt>
          <dd className="mt-1 text-xl font-bold text-foreground">{topicsWithScores.length}</dd>
        </div>
        <div className="rounded-xl border border-border p-3">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">
            Academy attempts
          </dt>
          <dd className="mt-1 text-xl font-bold text-foreground">{attempts.length}</dd>
        </div>
      </dl>

      {progress.length === 0 && attempts.length === 0 && enrolments.length === 0 ? (
        <p
          className="mt-4 rounded-xl border border-dashed border-border px-3 py-3 text-sm text-muted"
          data-testid="performance-empty"
        >
          No practice or Academy assessment activity yet. When you practise in GigaLearn or submit
          an Academy assessment, results will show here.
        </p>
      ) : null}

      {recent.length > 0 ? (
        <ul className="mt-4 space-y-2" aria-label="Recent practice topics">
          {recent.map(
            (row: {
              id: string;
              topicKey: string;
              subject?: string | null;
              lastScore?: number | null;
              practiceCount: number;
            }) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate font-medium text-foreground">
                  {row.subject ? `${row.subject} · ` : ""}
                  {row.topicKey}
                </span>
                <span className="text-xs text-muted">
                  {row.lastScore != null ? `Last score ${row.lastScore}%` : "No score yet"} ·{" "}
                  {row.practiceCount} practise
                  {row.practiceCount === 1 ? "" : "s"}
                </span>
              </li>
            )
          )}
        </ul>
      ) : null}
    </section>
  );
}

function ContinuePractisingCard() {
  const sessionToken = getSessionToken();
  const enrolments = useQuery(
    api.gigaLearnAcademy.listMyEnrolments,
    sessionToken ? { sessionToken } : "skip"
  );

  const resume =
    sessionToken && enrolments
      ? enrolments.find((e: { status: string; lastLessonId?: string | null }) =>
          e.status === "active" && Boolean(e.lastLessonId)
        ) ?? enrolments.find((e: { status: string }) => e.status === "active")
      : null;

  return (
    <section
      id="continue-practising"
      aria-labelledby="continue-heading"
      className="saas-card rounded-2xl border border-border bg-white p-4 sm:p-5"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-accent" aria-hidden />
        <h2 id="continue-heading" className="text-lg font-bold text-foreground">
          Continue practising
        </h2>
      </div>
      {!sessionToken && !hasPersistedAuth() ? (
        <p className="mt-2 text-sm text-muted">
          Sign in to resume your own Academy pathway. You cannot open another learner&apos;s private
          attempt.
        </p>
      ) : enrolments === undefined ? (
        <ClientAppHydrationNotice productName="GigaLearn Exam Practice" />
      ) : resume ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            Resume enrolled course{" "}
            <span className="font-semibold text-foreground">{resume.courseSlug}</span>
            {resume.progressPercent != null ? ` · ${resume.progressPercent}%` : ""}
          </p>
          <ButtonLink
            href={`/gigalearn/academy/course/?slug=${encodeURIComponent(resume.courseSlug)}`}
            className="min-h-11 shrink-0"
          >
            Continue
          </ButtonLink>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted" data-testid="continue-empty">
          No unfinished Academy attempt to resume. Open Student Learn or AI Tutor to practise, or
          enrol from the Academy catalogue.
        </p>
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <ButtonLink
          href={EXAM_PRACTICE_DESTINATIONS.studentLearn}
          variant="secondary"
          className="min-h-11"
        >
          Student practice
        </ButtonLink>
        <ButtonLink
          href={EXAM_PRACTICE_DESTINATIONS.academy}
          variant="secondary"
          className="min-h-11"
        >
          Academy catalogue
        </ButtonLink>
      </div>
    </section>
  );
}

export function ExamPracticeCentre() {
  return (
    <ExamPracticeChrome>
      <section
        aria-labelledby="exam-hero-heading"
        className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-accent/20 via-white to-violet-50 p-5 sm:p-7"
      >
        <div className="relative max-w-2xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Welcome</p>
          <h2
            id="exam-hero-heading"
            className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            {EXAM_PRACTICE_CENTRE_TITLE}
          </h2>
          <p className="text-sm text-muted sm:text-base">{EXAM_PRACTICE_CENTRE_TAGLINE}</p>
          <p className="text-sm text-muted">
            Separate centres for BECE learners and Ghana Teacher Promotion candidates. No invented
            question banks or scores.
          </p>
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
            <ButtonLink href="#bece-centre" className="min-h-11">
              BECE centre
            </ButtonLink>
            <ButtonLink href="#teacher-promotion-centre" variant="secondary" className="min-h-11">
              Teacher Promotion
            </ButtonLink>
          </div>
        </div>
      </section>

      <BeceCentreCard />
      <TeacherPromotionCentreCard />
      <AiStudyTutorCard />
      <MyPerformanceCard />
      <ContinuePractisingCard />
    </ExamPracticeChrome>
  );
}
