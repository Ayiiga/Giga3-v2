"use client";

import { ExamPracticeShareButton } from "@/components/gigalearn/exam/ExamPracticeShareButton";
import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSignInPrompt } from "@/components/seo/ProductSignInPrompt";
import { getUserEmail } from "@/lib/auth";
import { hasPersistedAuth } from "@/lib/auth/sessionRestore";
import { ACADEMY_SURFACE_CLASS } from "@/lib/gigalearn/academy/visualTheme";
import {
  EXAM_PRACTICE_DESTINATIONS,
  PROMOTION_RANK_BANK_SUMMARIES,
  PROMOTION_RANK_BANKS_TOTAL,
  PROMOTION_RANK_TARGET_COUNT,
} from "@/lib/gigalearn/examPractice/centreConfig";
import { EXAM_PRACTICE_FREE_QUESTION_COUNT } from "@/lib/gigalearn/examPractice/practiceLimits";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, CircleDashed, GraduationCap, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const RANK_CARDS = [
  {
    id: "ad-ii",
    officialName: "Assistant Director II",
    abbreviation: "AD II",
    summary: PROMOTION_RANK_BANK_SUMMARIES.find((b) => b.id === "ad-ii")!,
  },
  {
    id: "ad-i",
    officialName: "Assistant Director I",
    abbreviation: "AD I",
    summary: PROMOTION_RANK_BANK_SUMMARIES.find((b) => b.id === "ad-i")!,
  },
  {
    id: "deputy-director",
    officialName: "Deputy Director",
    abbreviation: "DD",
    summary: PROMOTION_RANK_BANK_SUMMARIES.find((b) => b.id === "deputy-director")!,
  },
  {
    id: "director-ii",
    officialName: "Director II",
    abbreviation: "D II",
    summary: PROMOTION_RANK_BANK_SUMMARIES.find((b) => b.id === "director-ii")!,
  },
  {
    id: "director-i",
    officialName: "Director I",
    abbreviation: "D I",
    summary: PROMOTION_RANK_BANK_SUMMARIES.find((b) => b.id === "director-i")!,
  },
] as const;

export function PromotionRankSelector() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(Boolean(getUserEmail() || hasPersistedAuth()));
  }, []);

  return (
    <div
      className={cn(
        ACADEMY_SURFACE_CLASS.shell,
        "gigalearn-stable document-compact mx-auto w-full min-w-0 max-w-3xl pb-[calc(var(--primary-nav-offset,0px)+1rem)]"
      )}
      data-testid="promotion-rank-selector"
    >
      <div className="academy-visual-panel min-w-0 space-y-4 p-3 sm:p-6">
        <header className="space-y-3">
          <Link
            href={EXAM_PRACTICE_DESTINATIONS.examHome}
            className="inline-flex min-h-9 items-center gap-2 text-sm text-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to Exam Practice
          </Link>
          <div className="flex flex-wrap items-start gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#14532D] to-[#166534] text-white shadow-md"
              aria-hidden
            >
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#14532D]">
                Teacher Promotion
              </p>
              <p className="text-2xl font-bold tracking-tight text-[#1E1B4B] sm:text-3xl">
                Choose your promotion rank
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Free practice for Ghana Education Service promotion preparation. Select your
                rank to start learn-mode practice with explanations after each answer. Not an
                official GES examination paper.
              </p>
            </div>
          </div>
          <p className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-xs text-[#14532D]">
            Published practice items across five ranks:{" "}
            <strong>
              {PROMOTION_RANK_BANKS_TOTAL.published} / {PROMOTION_RANK_BANKS_TOTAL.target}
            </strong>{" "}
            (target {PROMOTION_RANK_TARGET_COUNT} distinct items per rank). Counts below are live
            bank totals — not hardcoded claims.
          </p>
        </header>

        {!signedIn ? (
          <ProductSignInPrompt
            productName="Teacher Promotion practice"
            description="Sign in to start free rank practice with explanations and saved progress."
            nextPath="/gigalearn/exam/promotion/"
          />
        ) : null}

        <ul className="space-y-3" aria-label="Promotion ranks">
          {RANK_CARDS.map((rank) => {
            const bank = rank.summary;
            const atTarget = bank.publishedCount >= PROMOTION_RANK_TARGET_COUNT;
            const freeHref = bank.practiceHref;
            return (
              <li
                key={rank.id}
                className="rounded-2xl border border-[#BBF7D0] bg-white p-4 shadow-sm"
                data-testid={`promotion-rank-card-${rank.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#166534]">
                      {rank.abbreviation}
                    </p>
                    <h2 className="text-lg font-bold text-[#14532D]">{rank.officialName}</h2>
                    <p className="mt-1 text-sm text-slate-600">{bank.focus}</p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                      atTarget
                        ? "bg-emerald-100 text-emerald-900"
                        : "bg-amber-50 text-amber-900"
                    )}
                    data-testid={`promotion-rank-target-${rank.id}`}
                  >
                    {atTarget ? (
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <CircleDashed className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {bank.publishedCount} / {PROMOTION_RANK_TARGET_COUNT} questions
                    {atTarget ? " · target met" : ` · gap ${bank.gapToTarget}`}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Free practice available · Learn mode (explanations after each answer) · MCQ{" "}
                  {bank.mcqCount}
                  {bank.trueFalseCount > 0 ? ` · True/False ${bank.trueFalseCount}` : ""}
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {bank.available ? (
                    <Link
                      href={freeHref}
                      className="exam-landing-cta"
                      data-testid={`promotion-start-free-${rank.id}`}
                    >
                      <Play className="h-4 w-4 fill-current" aria-hidden />
                      Start Free Practice ({EXAM_PRACTICE_FREE_QUESTION_COUNT} questions)
                    </Link>
                  ) : (
                    <span className="text-sm text-slate-500">Bank not published yet.</span>
                  )}
                  {bank.available ? (
                    <Link
                      href={bank.fullHref}
                      className="exam-landing-cta exam-landing-cta--ghost"
                    >
                      Timed / full pack
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <ExamPracticeShareButton kind="teacher_promotion" label="Share Teacher Promotion" />
          <Link
            href={EXAM_PRACTICE_DESTINATIONS.promotionFreePractice}
            className="text-sm font-semibold text-[#14532D] underline-offset-2 hover:underline"
          >
            Or try free orientation practice
          </Link>
        </div>
        <ClientAppHydrationNotice productName="Teacher Promotion ranks" className="sr-only" />
      </div>
    </div>
  );
}
