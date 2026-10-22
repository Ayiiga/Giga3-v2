"use client";

import { ExamPracticeShareButton } from "@/components/gigalearn/exam/ExamPracticeShareButton";
import { LearningProgressRing } from "@/components/gigalearn/ui/LearningProgressRing";
import { ButtonLink } from "@/components/ui/Button";
import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSignInPrompt } from "@/components/seo/ProductSignInPrompt";
import { getSessionToken, getUserEmail } from "@/lib/auth";
import { hasPersistedAuth } from "@/lib/auth/sessionRestore";
import { ACADEMY_SURFACE_CLASS } from "@/lib/gigalearn/academy/visualTheme";
import {
  AD2_STUDY_GUIDE_SUMMARY,
  BECE_AWAITING_MATERIALS_MESSAGE,
  BECE_BANK_SUMMARY,
  BECE_SUBJECTS_AVAILABLE,
  EXAM_PRACTICE_CENTRE_TAGLINE,
  EXAM_PRACTICE_CENTRE_TITLE,
  EXAM_PRACTICE_DESTINATIONS,
  PROMOTION_RANK_BANKS_TOTAL,
  PROMOTION_RANK_BANK_SUMMARIES,
  TEACHER_PROMOTION_BANK_SUMMARY,
  TEACHER_PROMOTION_LEVEL_LABELS,
  TEACHER_PROMOTION_SOURCE_INVENTORY,
  answerStatusLabel,
} from "@/lib/gigalearn/examPractice/centreConfig";
import {
  EXAM_PRACTICE_FREE_QUESTION_COUNT,
  EXAM_PRACTICE_PAID_UNLOCK_COPY,
  EXAM_PRACTICE_PREMIUM_QUESTION_COUNT,
} from "@/lib/gigalearn/examPractice/practiceLimits";
import { loadLocalExamPracticeResults } from "@/lib/gigalearn/examPractice/localProgress";
import { PROMOTION_FREE_SET_META } from "@/lib/gigalearn/examPractice/promotionOrientationBank";
import {
  learnerEventSessionKey,
  markLearnerEventFired,
} from "@/lib/gigalearn/learnerEngagement";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  GraduationCap,
  LineChart,
  MessageCircle,
  NotebookPen,
  Play,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

function welcomeDisplayName(): string {
  const email = getUserEmail();
  if (!email) return "learner";
  const local = email.split("@")[0] || "learner";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

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
        "gigalearn-stable document-compact mx-auto w-full min-w-0 max-w-6xl pb-[calc(var(--primary-nav-offset,0px)+1rem)]"
      )}
    >
      <div className="academy-visual-panel min-w-0 space-y-4 p-3 sm:p-6">
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
      className="exam-landing-cta exam-landing-cta--ghost"
      style={{ color: "#4C1D95", background: "#F5F3FF", borderColor: "#DDD6FE" }}
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
      className="exam-landing-cta exam-landing-cta--ghost"
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
  const ready = BECE_BANK_SUMMARY.available && hasSubjects;

  return (
    <section id="bece-centre" aria-labelledby="bece-centre-heading" className="space-y-3">
      <div className="exam-landing-banner exam-landing-banner--bece">
        <div className="exam-ghana-stripe" aria-hidden />
        <div className="space-y-2 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <GraduationCap className="h-5 w-5" aria-hidden />
            <h2 id="bece-centre-heading" className="text-lg font-bold">
              BECE Mock Examination Centre
            </h2>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold">
              {ready ? "Independent practice" : "Awaiting sources"}
            </span>
          </div>
          <p className="text-sm text-white/90">
            {ready
              ? "Practise by subject, review explanations, and build stamina with timed sets."
              : "Practise by subject and review mistakes when verified BECE papers are available."}{" "}
            Teacher-promotion materials are never shown here.
          </p>
        </div>
      </div>

      {ready ? (
        <article className="exam-landing-card" data-testid="bece-practice-ready">
          <span className="exam-landing-pill" style={{ background: "#DDD6FE", color: "#4C1D95" }}>
            {BECE_BANK_SUMMARY.approvedCount} objective items
          </span>
          <h3 className="mt-3 text-base font-bold text-[#4C1D95]">
            Ghana BECE preparation practice
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Independent objective practice with explanations across imported subjects. Not an
            official WAEC paper — confirm current syllabus guidance for your year.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2" data-testid="bece-subjects-slot" data-ready="true">
            {BECE_SUBJECTS_AVAILABLE.map((s) => (
              <li key={s.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <span className="font-medium text-slate-800">{s.label}</span>
                {s.questionCount != null ? (
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {s.questionCount} questions
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link href={EXAM_PRACTICE_DESTINATIONS.becePractice} className="exam-landing-cta">
              <Play className="h-4 w-4 fill-current" aria-hidden />
              Start free {EXAM_PRACTICE_FREE_QUESTION_COUNT} questions
            </Link>
            <Link
              href={EXAM_PRACTICE_DESTINATIONS.beceTimed}
              className="exam-landing-cta exam-landing-cta--ghost"
              style={{ color: "#4C1D95", background: "#F5F3FF", borderColor: "#DDD6FE" }}
            >
              Timed practice
            </Link>
            <Link
              href={EXAM_PRACTICE_DESTINATIONS.becePracticeFull}
              className="exam-landing-cta exam-landing-cta--ghost"
              style={{ color: "#4C1D95", background: "#F5F3FF", borderColor: "#DDD6FE" }}
            >
              Full pack (up to {EXAM_PRACTICE_PREMIUM_QUESTION_COUNT})
            </Link>
            <Link
              href={EXAM_PRACTICE_DESTINATIONS.beceCourse}
              className="exam-landing-cta exam-landing-cta--ghost"
              style={{ color: "#4C1D95", background: "#F5F3FF", borderColor: "#DDD6FE" }}
            >
              Enrol / course page
            </Link>
          </div>
          <div className="mt-3">
            <ExamPracticeShareButton kind="bece" label="Share BECE practice" />
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <StudentLearnFromExamLink />
            <Link
              href={EXAM_PRACTICE_DESTINATIONS.aiTutor}
              className="exam-landing-cta exam-landing-cta--ghost"
              style={{ color: "#4C1D95", background: "#F5F3FF", borderColor: "#DDD6FE" }}
            >
              Ask AI Tutor
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Free sessions use {EXAM_PRACTICE_FREE_QUESTION_COUNT} questions.{" "}
            {EXAM_PRACTICE_PAID_UNLOCK_COPY} unlocks up to {EXAM_PRACTICE_PREMIUM_QUESTION_COUNT}{" "}
            (capped by bank size). Not an official WAEC/BECE paper bank.
          </p>
        </article>
      ) : (
        <article className="exam-landing-card" data-testid="bece-awaiting-materials" role="status">
          <span className="exam-landing-pill" style={{ background: "#DDD6FE", color: "#4C1D95" }}>
            Coming soon
          </span>
          <h3 className="mt-3 text-base font-bold text-[#4C1D95]">
            {BECE_AWAITING_MATERIALS_MESSAGE}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            No BECE examination papers were identified in the current source set. Subject cards and
            timed mocks will appear here after verified materials are imported and reviewed — we will
            not invent WAEC papers.
          </p>
          <ul
            className="mt-3 hidden"
            aria-hidden
            data-testid="bece-subjects-slot"
            data-ready="false"
          />
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <StudentLearnFromExamLink />
            <Link
              href={EXAM_PRACTICE_DESTINATIONS.aiTutor}
              className="exam-landing-cta exam-landing-cta--ghost"
              style={{ color: "#4C1D95", background: "#F5F3FF", borderColor: "#DDD6FE" }}
            >
              Ask AI Tutor
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            AI-generated practice is labelled separately and is not an official WAEC/BECE paper bank.
          </p>
        </article>
      )}
    </section>
  );
}

function TeacherPromotionCentreCard() {
  const name = welcomeDisplayName();
  const signedIn = Boolean(getUserEmail());

  return (
    <section
      id="teacher-promotion-centre"
      aria-labelledby="teacher-promotion-heading"
      className="space-y-3"
      data-testid="teacher-promotion-centre"
    >
      <div className="exam-landing-banner">
        <div className="exam-ghana-stripe" aria-hidden />
        <div className="space-y-2 p-4 sm:p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#FACC15]">Welcome</p>
          <h2 id="teacher-promotion-heading" className="text-xl font-bold sm:text-2xl">
            Ghana Teacher Promotion Practice
          </h2>
          {signedIn ? (
            <p className="text-sm font-semibold text-[#FACC15]">Hello, {name}</p>
          ) : null}
          <p className="text-sm text-white/90">
            {signedIn
              ? `Your free ${EXAM_PRACTICE_FREE_QUESTION_COUNT}-question practice is ready.`
              : "Independent practice for Ghana Education Service promotion-exam preparation."}
          </p>
          <p className="text-xs text-white/75">
            Promotion Exam Preparation Practice · GigaLearn on {siteConfig.name}
          </p>
        </div>
      </div>

      <article className="exam-landing-card">
        <span className="exam-landing-pill">{PROMOTION_FREE_SET_META.freeLabel}</span>
        <div className="mt-3 flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#14532D]"
            aria-hidden
          >
            <NotebookPen className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-[#14532D]">{PROMOTION_FREE_SET_META.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{PROMOTION_FREE_SET_META.subtitle}</p>
          </div>
        </div>
        <Link
          href={EXAM_PRACTICE_DESTINATIONS.promotionRankSelect}
          className="exam-landing-cta mt-4"
          data-testid="teacher-promotion-choose-rank"
        >
          <Play className="h-4 w-4 fill-current" aria-hidden />
          Choose rank · Start Free Practice
        </Link>
        <Link
          href={EXAM_PRACTICE_DESTINATIONS.promotionFreePractice}
          className="exam-landing-cta exam-landing-cta--ghost mt-2"
        >
          Free orientation ({EXAM_PRACTICE_FREE_QUESTION_COUNT} mixed questions)
        </Link>
        <div className="mt-2">
          <ExamPracticeShareButton
            kind="teacher_promotion"
            label="Share Teacher Promotion practice"
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">{PROMOTION_FREE_SET_META.provenanceNote}</p>
      </article>

      {TEACHER_PROMOTION_BANK_SUMMARY.available ? (
        <article className="exam-landing-card" data-testid="teacher-promotion-bank-ready">
          <span className="exam-landing-pill">
            {TEACHER_PROMOTION_BANK_SUMMARY.approvedCount} approved ·{" "}
            {TEACHER_PROMOTION_BANK_SUMMARY.pendingCount} provisional
          </span>
          <h3 className="mt-3 text-base font-bold text-[#14532D]">
            GES Teachers Promotion aptitude bank
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Interactive practice from the imported promotion objective set. Provisional items are
            labelled in learn mode — not claimed as an official GES examination paper.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href={EXAM_PRACTICE_DESTINATIONS.teacherPromotionPractice}
              className="exam-landing-cta"
            >
              <Play className="h-4 w-4 fill-current" aria-hidden />
              Open promotion practice
            </Link>
            <Link
              href={EXAM_PRACTICE_DESTINATIONS.teacherPromotionLearn}
              className="exam-landing-cta exam-landing-cta--ghost"
            >
              Learn mode
            </Link>
            <Link
              href={EXAM_PRACTICE_DESTINATIONS.teacherPromotionPracticeFull}
              className="exam-landing-cta exam-landing-cta--ghost"
            >
              Full pack (up to {EXAM_PRACTICE_PREMIUM_QUESTION_COUNT})
            </Link>
            <Link
              href={EXAM_PRACTICE_DESTINATIONS.teacherPromotionCourse}
              className="exam-landing-cta exam-landing-cta--ghost"
            >
              Enrol / course page
            </Link>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Free sessions use {EXAM_PRACTICE_FREE_QUESTION_COUNT} questions.{" "}
            {EXAM_PRACTICE_PAID_UNLOCK_COPY} unlocks up to {EXAM_PRACTICE_PREMIUM_QUESTION_COUNT} from
            the imported bank. {AD2_STUDY_GUIDE_SUMMARY.note}
          </p>
        </article>
      ) : null}

      <Link
        href="#my-performance"
        className="exam-landing-card flex items-center gap-3 hover:border-[#86EFAC]"
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF2F2] text-[#DC2626]"
          aria-hidden
        >
          <LineChart className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-slate-900">My Performance</p>
          <p className="text-sm text-slate-600">Scores and improvement from your real practice.</p>
        </div>
      </Link>

      <article className="exam-landing-card exam-landing-card--gold">
        <span className="exam-landing-ribbon" aria-hidden>
          Full access
        </span>
        <div className="pr-10 text-center">
          <span className="exam-landing-pill">Full access available</span>
          <h3 className="mt-3 text-lg font-bold text-[#14532D]">Upgrade whenever you are ready</h3>
          <p className="mt-1 text-sm text-slate-600">
            Unlock GigaLearn credits, Academy pathways, Teacher hub tools, and AI Tutor — without
            Mobile Money side channels.
          </p>
          <p className="mt-3 text-3xl font-extrabold text-[#14532D]">Credits &amp; plans</p>
        </div>
        <div className="mt-4 space-y-2 rounded-xl bg-[#FFFBEB] px-3 py-3 text-sm text-[#78350F]">
          <p className="font-semibold">What you get on Giga3</p>
          <ul className="list-inside list-disc space-y-1 text-[#92400E]">
            <li>
              Free {EXAM_PRACTICE_FREE_QUESTION_COUNT}-question orientation practice (repeat anytime)
            </li>
            <li>
              Up to {EXAM_PRACTICE_PREMIUM_QUESTION_COUNT} practice questions with{" "}
              {EXAM_PRACTICE_PAID_UNLOCK_COPY}
            </li>
            <li>Rewards and progress on correct answers</li>
            <li>Teacher hub AI practice tools</li>
            <li>Academy assessments when enrolled</li>
            <li>Paystack billing in GHS — no unofficial MoMo activation</li>
          </ul>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <Link href={EXAM_PRACTICE_DESTINATIONS.credits} className="exam-landing-cta">
            Open credits / plans
          </Link>
          <Link
            href={EXAM_PRACTICE_DESTINATIONS.pricing}
            className="exam-landing-cta exam-landing-cta--ghost"
          >
            View pricing
          </Link>
          <TeacherHubPracticeLink />
        </div>
        <p className="mt-3 text-xs text-slate-500" data-testid="promotion-bank-pending">
          {TEACHER_PROMOTION_BANK_SUMMARY.available
            ? `${TEACHER_PROMOTION_BANK_SUMMARY.pendingCount} imported items remain pending review; free orientation practice and AI tools stay clearly labelled as non-official.`
            : "Larger source-derived GES banks remain pending review. Until then, free orientation practice and AI tools are clearly labelled as non-official."}
        </p>
      </article>

      <div className="exam-landing-card" data-testid="promotion-rank-banks">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[#14532D]" aria-hidden />
          <p className="text-xs font-bold uppercase tracking-wide text-[#14532D]">
            Rank practice banks
          </p>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Five separate banks for AD II through Director I. Distinct published practice items:{" "}
          {PROMOTION_RANK_BANKS_TOTAL.published} of {PROMOTION_RANK_BANKS_TOTAL.target} target
          (550 per rank is a backlog goal, not a claim that each bank has 550 items). Exact
          cross-rank duplicate stems were removed. All items await human verification. Study
          PDFs:{" "}
          <Link
            href={EXAM_PRACTICE_DESTINATIONS.promotionGuidesZip}
            className="font-semibold text-[#14532D] underline-offset-2 hover:underline"
          >
            download all guides (ZIP)
          </Link>
          .
        </p>
        <ul className="mt-3 space-y-3">
          {PROMOTION_RANK_BANK_SUMMARIES.map((bank) => (
            <li
              key={bank.id}
              className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-3"
              data-testid={`promotion-rank-${bank.id}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="text-sm font-bold text-[#14532D]">{bank.shortLabel}</h4>
                <span className="text-xs font-semibold text-[#166534]">
                  {bank.publishedCount} published · gap {bank.gapToTarget}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600">{bank.focus}</p>
              <p className="mt-1 text-xs text-slate-500" data-testid={`promotion-rank-types-${bank.id}`}>
                Formats:{" "}
                {bank.questionTypes.includes("mcq")
                  ? `MCQ (${bank.mcqCount})`
                  : "MCQ not yet available"}
                {" · "}
                {bank.questionTypes.includes("true_false")
                  ? `True/False (${bank.trueFalseCount})`
                  : "True/False not yet available for this rank"}
              </p>
              {bank.available ? (
                <div className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
                  {bank.questionTypes.includes("mcq") && bank.mcqHref ? (
                    <Link href={bank.mcqHref} className="exam-landing-cta !py-2 !text-xs">
                      <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
                      MCQ practice
                    </Link>
                  ) : null}
                  {bank.questionTypes.includes("true_false") && bank.trueFalseHref ? (
                    <Link
                      href={bank.trueFalseHref}
                      className="exam-landing-cta !py-2 !text-xs"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
                      True/False practice
                    </Link>
                  ) : (
                    <span className="self-center text-xs text-slate-500">
                      True/False: not imported for this rank yet
                    </span>
                  )}
                  <Link
                    href={bank.fullHref}
                    className="exam-landing-cta exam-landing-cta--ghost !py-2 !text-xs"
                  >
                    Full pack (entitlement)
                  </Link>
                  <Link
                    href={bank.courseHref}
                    className="exam-landing-cta exam-landing-cta--ghost !py-2 !text-xs"
                  >
                    Enrol
                  </Link>
                  {bank.guidePdfHref ? (
                    <Link
                      href={bank.guidePdfHref}
                      className="exam-landing-cta exam-landing-cta--ghost !py-2 !text-xs"
                    >
                      Download PDF guide
                    </Link>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500">Bank not published yet.</p>
              )}
            </li>
          ))}
        </ul>
        <ul className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          {TEACHER_PROMOTION_LEVEL_LABELS.map((level) => (
            <li
              key={level.id}
              className="rounded-full border border-[#BBF7D0] bg-[#ECFDF5] px-3 py-1.5 text-xs font-semibold text-[#14532D]"
            >
              {level.label}
              {!level.courseSlug ? " (coming later)" : ""}
            </li>
          ))}
        </ul>
        <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          {TEACHER_PROMOTION_SOURCE_INVENTORY.map((src) => (
            <li key={src.id} className="text-sm">
              <span className="font-medium text-slate-800">{src.title}</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {answerStatusLabel(src.answerStatus)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="px-1 text-center text-[11px] text-slate-500">
        Independent study and revision on GigaLearn. Not an official Ghana Education Service
        examination portal.
      </p>
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

function LocalExamProgressBlock() {
  const [rows, setRows] = useState(() =>
    typeof window === "undefined" ? [] : loadLocalExamPracticeResults()
  );

  useEffect(() => {
    setRows(loadLocalExamPracticeResults());
  }, []);

  if (rows.length === 0) return null;

  return (
    <div className="mt-4" data-testid="local-exam-progress">
      <h3 className="text-sm font-bold text-slate-800">Recent Exam Practice (this device)</h3>
      <ul className="mt-2 space-y-2" aria-label="Local exam practice results">
        {rows.slice(0, 5).map((row) => (
          <li
            key={`${row.setId}-${row.finishedAt}`}
            className="academy-visual-tile flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm"
          >
            <span className="min-w-0 truncate font-medium">
              {row.category === "bece" ? "BECE" : "Teacher Promotion"} · {row.setId}
            </span>
            <span className="academy-visual-muted text-xs">
              {row.percent}% · {row.correct}/{row.total}
            </span>
          </li>
        ))}
      </ul>
    </div>
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
          invent scores or streaks. Free orientation results can still appear on this device below.
        </p>
        <LocalExamProgressBlock />
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

      <LocalExamProgressBlock />

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
        className="exam-landing-banner relative overflow-hidden"
      >
        <div className="exam-ghana-stripe" aria-hidden />
        <div className="relative max-w-2xl space-y-3 p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#FACC15]">Welcome</p>
          <h2
            id="exam-hero-heading"
            className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
          >
            {EXAM_PRACTICE_CENTRE_TITLE}
          </h2>
          <p className="text-sm text-white/90 sm:text-base">{EXAM_PRACTICE_CENTRE_TAGLINE}</p>
          <p className="text-sm text-white/80">
            Clear centres for BECE learners and Ghana Teacher Promotion candidates — with honest
            labels, timed practice, and real performance only.
          </p>
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
            <Link
              href={EXAM_PRACTICE_DESTINATIONS.promotionRankSelect}
              className="exam-landing-cta sm:w-auto sm:px-5"
              data-testid="teacher-promotion-primary-cta"
            >
              Teacher Promotion
            </Link>
            <Link
              href="#bece-centre"
              className="exam-landing-cta exam-landing-cta--ghost sm:w-auto sm:px-5"
            >
              BECE centre
            </Link>
          </div>
        </div>
      </section>

      <TeacherPromotionCentreCard />
      <BeceCentreCard />
      <AiStudyTutorCard />
      <MyPerformanceCard />
      <ContinuePractisingCard />
    </ExamPracticeChrome>
  );
}
