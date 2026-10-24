"use client";

import { ExamQuizSession } from "@/components/gigalearn/exam/ExamQuizSession";
import { PremiumPracticeNudge } from "@/components/gigalearn/exam/PremiumPracticeNudge";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { Button } from "@/components/ui/Button";
import { getSessionToken } from "@/lib/auth";
import { EXAM_PRACTICE_DESTINATIONS } from "@/lib/gigalearn/examPractice/centreConfig";
import {
  buildShuffledFreePractice,
  clearFreePracticeDraft,
  createFreePracticeSeed,
  loadFreePracticeDraft,
  saveFreePracticeDraft,
  type FreePracticeDraft,
} from "@/lib/gigalearn/examPractice/freePracticeSession";
import { PROMOTION_FREE_SET_META } from "@/lib/gigalearn/examPractice/promotionOrientationBank";
import { api } from "convex/_generated/api";
import { useMutation } from "convex/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

function newOrRestoredDraft(): FreePracticeDraft {
  const restored = loadFreePracticeDraft(PROMOTION_FREE_SET_META.id);
  if (restored && restored.questions.length === PROMOTION_FREE_SET_META.questionCount) {
    return restored;
  }
  return buildShuffledFreePractice(
    PROMOTION_FREE_SET_META.id,
    createFreePracticeSeed(),
    PROMOTION_FREE_SET_META.durationMinutes
  );
}

export function ExamPracticeSessionRoot() {
  const [draft, setDraft] = useState<FreePracticeDraft | null>(null);
  const recordEvent = useMutation(api.foundingMembersOffer.recordOfferEvent);

  useEffect(() => {
    const next = newOrRestoredDraft();
    setDraft(next);
    saveFreePracticeDraft(next);
  }, []);

  const onDraftChange = useCallback(
    (patch: {
      answers?: FreePracticeDraft["answers"];
      index?: number;
      secondsLeft?: number;
      finished?: boolean;
      streak?: number;
      started?: boolean;
    }) => {
      setDraft((prev) => {
        if (!prev) return prev;
        const next: FreePracticeDraft = {
          ...prev,
          ...patch,
          questions: prev.questions,
          seed: prev.seed,
          setId: prev.setId,
        };
        saveFreePracticeDraft(next);
        return next;
      });
    },
    []
  );

  const restart = useCallback(() => {
    clearFreePracticeDraft();
    const next = buildShuffledFreePractice(
      PROMOTION_FREE_SET_META.id,
      createFreePracticeSeed(),
      PROMOTION_FREE_SET_META.durationMinutes
    );
    setDraft(next);
    saveFreePracticeDraft(next);
  }, []);

  const beginPractice = useCallback(() => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, started: true };
      saveFreePracticeDraft(next);
      return next;
    });
    void recordEvent({
      eventType: "free_practice_started",
      sessionToken: getSessionToken() ?? undefined,
      meta: PROMOTION_FREE_SET_META.id,
    }).catch(() => undefined);
  }, [recordEvent]);

  return (
    <ConvexAppShell>
      {!draft ? (
        <div className="exam-session">
          <p className="exam-session-footnote">Preparing practice…</p>
        </div>
      ) : !draft.started ? (
        <div className="exam-session" data-testid="free-practice-prestart">
          <header className="exam-session-banner">
            <div className="exam-ghana-stripe" aria-hidden />
            <div className="exam-session-banner-inner">
              <h1 className="exam-session-banner-title">{PROMOTION_FREE_SET_META.title}</h1>
              <p className="exam-session-banner-sub">
                Independent practice platform for Ghana Education Service promotion-exam
                preparation
              </p>
            </div>
          </header>
          <div className="exam-session-body">
            <article className="exam-session-card exam-session-card--pad space-y-4">
              <PremiumPracticeNudge variant="prestart" />
              <p className="text-sm text-slate-600">{PROMOTION_FREE_SET_META.subtitle}</p>
              <p className="text-xs text-slate-500">{PROMOTION_FREE_SET_META.provenanceNote}</p>
              <Button
                type="button"
                className="exam-session-btn-primary min-h-11 w-full"
                data-testid="free-practice-begin"
                onClick={beginPractice}
              >
                Start free practice
              </Button>
              <Link
                href={EXAM_PRACTICE_DESTINATIONS.examHome}
                className="exam-session-btn-secondary min-h-11 w-full"
              >
                Back to Exam Practice
              </Link>
            </article>
          </div>
        </div>
      ) : (
        <ExamQuizSession
          meta={PROMOTION_FREE_SET_META}
          questions={draft.questions}
          exitHref={EXAM_PRACTICE_DESTINATIONS.examHome}
          theme="teacher"
          enablePremiumUpgrade
          initialAnswers={draft.answers}
          initialIndex={draft.index}
          initialSecondsLeft={draft.secondsLeft}
          initialFinished={draft.finished}
          initialStreak={draft.streak}
          onDraftChange={onDraftChange}
          onRestart={restart}
        />
      )}
    </ConvexAppShell>
  );
}
