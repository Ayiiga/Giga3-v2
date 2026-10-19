"use client";

import { LearningProgressRing } from "@/components/gigalearn/ui/LearningProgressRing";
import { ButtonLink } from "@/components/ui/Button";
import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSignInPrompt } from "@/components/seo/ProductSignInPrompt";
import { getSessionToken } from "@/lib/auth";
import { hasPersistedAuth } from "@/lib/auth/sessionRestore";
import { ACADEMY_SURFACE_CLASS } from "@/lib/gigalearn/academy/visualTheme";
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
import {
  learnerEventSessionKey,
  markLearnerEventFired,
} from "@/lib/gigalearn/learnerEngagement";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  GraduationCap,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";

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
    <div
      className={cn(
        ACADEMY_SURFACE_CLASS.shell,
        "gigalearn-stable document-compact mx-auto max-w-6xl pb-[calc(var(--primary-nav-offset,0px)+1rem)]"
      )}
    >
      <div className="academy-visual-panel space-y-4 p-4 sm:p-6">
        <header className="space-y-3">
          <Link
            href={EXAM_PRACTICE_DESTINATIONS.gigalearnHome}
            className="inline-flex min-h-9 items-center gap-2 text-sm text-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to GigaLearn
          </Link>
          <div className="flex flex-wrap items-start gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0F766E] to-[#115E59] text-white shadow-md"
              aria-hidden
            >
              <ClipboardList className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0F766E]">
                GigaLearn
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-[#1E1B4B] sm:text-3xl">
                {EXAM_PRACTICE_CENTRE_TITLE}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{EXAM_PRACTICE_CENTRE_TAGLINE}</p>
            </div>
          </div>
          <nav aria-label="Exam Practice and Academy" className="relative -mx-1">
            <div className="academy-visual-nav gigalearn-grade-scroll px-1">
              {EXAM_NAV.map((item) => {
                const isActive = item.key === "exam";
                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    className={cn(
                      "academy-visual-nav-link",
                      isActive && "academy-visual-nav-link--active"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </header>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}

function StudentLearnFromExamLink() {
  const sessionToken = getSessionToken();
  const recordEvent = useMutation(api.gigaLearnEngagement.recordLearnerEvent);
  return (
    <Link
      href={EXAM_PRACTICE_DESTINATIONS.studentLearn}
      className="academy-visual-cta academy-visual-cta--solid"
      onClick={() => {
        if (!sessionToken) return;
        const key = learnerEventSessionKey("student_learn_from_exam");
        if (!markLearnerEventFired(key)) return;
        void recordEvent({
          sessionToken,
          event: "student_learn_from_exam",
        }).catch(() => undefined);
      }}
    >
      Student Learn (AI practice)
    </Link>
  );
}

function TeacherHubPracticeLink() {
  const sessionToken = getSessionToken();
  const recordEvent = useMutation(api.gigaLearnEngagement.recordLearnerEvent);
  return (
    <Link
      href={EXAM_PRACTICE_DESTINATIONS.teacherHub}
      className="academy-visual-cta academy-visual-cta--solid"
      onClick={() => {
        if (!sessionToken) return;
        const key = learnerEventSessionKey("teacher_hub_from_exam");
        if (!markLearnerEventFired(key)) return;
        void recordEvent({
          sessionToken,
          event: "teacher_hub_from_exam",
        }).catch(() => undefined);
      }}
    >
      Teacher hub tools
    </Link>
  );
}

function BeceCentreCard() {
  const hasSubjects = BECE_SUBJECTS_AVAILABLE.length > 0;

  return (
    <section
      id="bece-centre"
      aria-labelledby="bece-centre-heading"
      className={cn(ACADEMY_SURFACE_CLASS.bece, "p-4 sm:p-5")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <GraduationCap className="h-5 w-5" aria-hidden />
        <h2 id="bece-centre-heading" className="text-lg font-bold">
          BECE Mock Examination Centre
        </h2>
        <span className="academy-visual-chip rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
          Awaiting sources
        </span>
      </div>
      <p className="academy-visual-muted mt-2 text-sm">
        Practise by subject, review mistakes, and prepare for BECE — using verified papers only when
        they are available. Teacher-promotion materials are never shown here.
      </p>

      <div
        className="academy-visual-tile mt-4 rounded-xl border-dashed px-3 py-4"
        role="status"
        data-testid="bece-awaiting-materials"
      >
        <p className="text-sm font-semibold">{BECE_AWAITING_MATERIALS_MESSAGE}</p>
        <p className="academy-visual-muted mt-1 text-xs">
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
            <li key={s.id} className="academy-visual-tile rounded-xl px-3 py-2 text-sm">
              {s.label}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
          Related study tools (not official BECE papers)
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <StudentLearnFromExamLink />
          <Link
            href={EXAM_PRACTICE_DESTINATIONS.aiTutor}
            className="academy-visual-cta academy-visual-cta--ghost"
          >
            Ask AI Tutor
          </Link>
        </div>
        <p className="academy-visual-muted text-xs">
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
      className={cn(ACADEMY_SURFACE_CLASS.teacher, "relative overflow-hidden p-4 sm:p-5")}
      data-testid="teacher-promotion-centre"
    >
      <div className="pointer-events-none absolute right-0 top-0 rounded-bl-2xl bg-[var(--av-accent,#FACC15)] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#14532D]">
        Full access path
      </div>
      <div className="flex flex-wrap items-center gap-2 pr-16">
        <BookOpen className="h-5 w-5" aria-hidden />
        <h2 id="teacher-promotion-heading" className="text-lg font-bold">
          Ghana Teacher Promotion Practice
        </h2>
        <span className="academy-visual-chip rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
          Sources identified
        </span>
      </div>
      <p className="academy-visual-muted mt-2 text-sm">
        Prepare for Ghana Education Service promotion aptitude practice. Source-derived question
        banks are not published until review. Separate from BECE student papers.
      </p>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--av-accent,#FACC15)]">
          Promotion levels (from GES advert metadata)
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {TEACHER_PROMOTION_LEVEL_LABELS.map((level) => (
            <li
              key={level.id}
              className="rounded-full border border-[var(--av-border)] bg-[var(--av-surface)] px-3 py-1.5 text-xs font-medium"
            >
              {level.label}
            </li>
          ))}
        </ul>
        <p className="academy-visual-muted mt-2 text-xs">
          Levels are labels only — no rank-specific mock is unlocked until a reviewed bank is
          published for that rank.
        </p>
      </div>

      <div className="academy-visual-tile mt-4 rounded-xl p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--av-accent,#FACC15)]">
          Source inventory (not yet imported)
        </p>
        <ul className="mt-2 space-y-2">
          {TEACHER_PROMOTION_SOURCE_INVENTORY.map((src) => (
            <li key={src.id} className="text-sm">
              <span className="font-medium">{src.title}</span>
              <span className="academy-visual-muted mt-0.5 block text-xs">
                {answerStatusLabel(src.answerStatus)}
              </span>
            </li>
          ))}
        </ul>
        <p className="academy-visual-muted mt-3 text-xs" data-testid="promotion-bank-pending">
          Reviewed import is a later phase. Answer keys are not treated as verified until review.
        </p>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--av-accent,#FACC15)]">
          Available now (AI practice — not source papers)
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <TeacherHubPracticeLink />
          <Link
            href={EXAM_PRACTICE_DESTINATIONS.aiTutor}
            className="academy-visual-cta academy-visual-cta--ghost"
          >
            AI Tutor
          </Link>
          <Link
            href={EXAM_PRACTICE_DESTINATIONS.academyAssess}
            className="academy-visual-cta academy-visual-cta--ghost"
          >
            Academy assessments
          </Link>
        </div>
        <p className="academy-visual-muted text-xs">
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
      className={cn(ACADEMY_SURFACE_CLASS.catalogue, "p-4 sm:p-5")}
      data-testid="ai-study-tutor"
    >
      <div className="flex flex-wrap items-center gap-2">
        <MessageCircle className="h-5 w-5 text-[#6D28D9]" aria-hidden />
        <h2 id="ai-tutor-heading" className="text-lg font-bold text-[#1E1B4B]">
          AI Study Tutor
        </h2>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Use the existing GigaLearn AI Tutor to explain topics, walk through similar practice, and
        plan revision. The tutor does not replace verified examination answer keys.
      </p>
      <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-600">
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
        className={cn(ACADEMY_SURFACE_CLASS.performance, "p-4 sm:p-5")}
        data-testid="my-performance"
      >
        <h2 id="performance-heading" className="text-lg font-bold">
          My Performance
        </h2>
        <p className="academy-visual-muted mt-2 text-sm">
          Sign in to see your real GigaLearn practice and Academy assessment history. We do not
          invent scores or streaks.
        </p>
        <div className="mt-4 rounded-xl border border-[var(--av-border)] bg-[var(--av-surface)] p-3">
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
        className={cn(ACADEMY_SURFACE_CLASS.performance, "p-4 sm:p-5")}
        data-testid="my-performance"
      >
        <h2 id="performance-heading" className="text-lg font-bold">
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
      className={cn(ACADEMY_SURFACE_CLASS.performance, "p-4 sm:p-5")}
      data-testid="my-performance"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="performance-heading" className="text-lg font-bold">
            My Performance
          </h2>
          <p className="academy-visual-muted mt-1 text-sm">
            Server-verified practice topics and Academy assessments for your account only.
          </p>
        </div>
        <Link
          href={EXAM_PRACTICE_DESTINATIONS.academyMy}
          className="text-sm font-semibold underline-offset-2 hover:underline"
        >
          My courses →
        </Link>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="academy-visual-tile rounded-xl p-3">
          <dt className="academy-visual-muted text-[11px] font-medium uppercase tracking-wide">
            Practice topics
          </dt>
          <dd className="mt-1 text-xl font-bold">{progress.length}</dd>
        </div>
        <div className="academy-visual-tile rounded-xl p-3">
          <dt className="academy-visual-muted text-[11px] font-medium uppercase tracking-wide">
            Scored topics
          </dt>
          <dd className="mt-1 text-xl font-bold">{topicsWithScores.length}</dd>
        </div>
        <div className="academy-visual-tile rounded-xl p-3">
          <dt className="academy-visual-muted text-[11px] font-medium uppercase tracking-wide">
            Academy attempts
          </dt>
          <dd className="mt-1 text-xl font-bold">{attempts.length}</dd>
        </div>
      </dl>

      {progress.length === 0 && attempts.length === 0 && enrolments.length === 0 ? (
        <p
          className="academy-visual-tile academy-visual-muted mt-4 rounded-xl border-dashed px-3 py-3 text-sm"
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
                className="academy-visual-tile flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate font-medium">
                  {row.subject ? `${row.subject} · ` : ""}
                  {row.topicKey}
                </span>
                <span className="academy-visual-muted text-xs">
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

  const progressPercent =
    resume && typeof resume.progressPercent === "number" ? resume.progressPercent : 0;

  return (
    <section
      id="continue-practising"
      aria-labelledby="continue-heading"
      className={cn(ACADEMY_SURFACE_CLASS.catalogue, "p-4 sm:p-5")}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[#6D28D9]" aria-hidden />
        <h2 id="continue-heading" className="text-lg font-bold text-[#1E1B4B]">
          Continue practising
        </h2>
      </div>
      {!sessionToken && !hasPersistedAuth() ? (
        <p className="mt-2 text-sm text-slate-600">
          Sign in to resume your own Academy pathway. You cannot open another learner&apos;s private
          attempt.
        </p>
      ) : enrolments === undefined ? (
        <ClientAppHydrationNotice productName="GigaLearn Exam Practice" />
      ) : resume ? (
        <div className="academy-visual-course-card mt-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <LearningProgressRing percent={progressPercent} />
            <p className="text-sm text-slate-600">
              Resume enrolled course{" "}
              <span className="font-semibold text-[#1E1B4B]">{resume.courseSlug}</span>
              {resume.progressPercent != null ? ` · ${resume.progressPercent}%` : ""}
            </p>
          </div>
          <ButtonLink
            href={`/gigalearn/academy/course/?slug=${encodeURIComponent(resume.courseSlug)}`}
            className="academy-visual-cta academy-visual-cta--success min-h-11 shrink-0"
          >
            Continue
          </ButtonLink>
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-600" data-testid="continue-empty">
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
  const sessionToken = getSessionToken();
  const recordEvent = useMutation(api.gigaLearnEngagement.recordLearnerEvent);

  useEffect(() => {
    if (!sessionToken) return;
    const key = learnerEventSessionKey("exam_centre_open");
    if (!markLearnerEventFired(key)) return;
    void recordEvent({ sessionToken, event: "exam_centre_open" }).catch(() => undefined);
  }, [sessionToken, recordEvent]);

  return (
    <ExamPracticeChrome>
      <section
        aria-labelledby="exam-hero-heading"
        className={cn(ACADEMY_SURFACE_CLASS.hero, "relative overflow-hidden p-5 sm:p-7")}
      >
        <div className="relative max-w-2xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/90">Welcome</p>
          <h2
            id="exam-hero-heading"
            className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
          >
            {EXAM_PRACTICE_CENTRE_TITLE}
          </h2>
          <p className="academy-visual-muted text-sm sm:text-base">{EXAM_PRACTICE_CENTRE_TAGLINE}</p>
          <p className="academy-visual-muted text-sm">
            Separate centres for BECE learners and Ghana Teacher Promotion candidates. No invented
            question banks or scores.
          </p>
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
            <Link href="#bece-centre" className="academy-visual-cta academy-visual-cta--solid">
              BECE centre
            </Link>
            <Link
              href="#teacher-promotion-centre"
              className="academy-visual-cta academy-visual-cta--ghost"
            >
              Teacher Promotion
            </Link>
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
