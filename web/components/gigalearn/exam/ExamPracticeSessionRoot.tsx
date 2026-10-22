"use client";

import { ExamQuizSession } from "@/components/gigalearn/exam/ExamQuizSession";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
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

  return (
    <ConvexAppShell>
      {!draft ? (
        <div className="exam-session">
          <p className="exam-session-footnote">Preparing practice…</p>
        </div>
      ) : (
        <ExamQuizSession
          meta={PROMOTION_FREE_SET_META}
          questions={draft.questions}
          exitHref={EXAM_PRACTICE_DESTINATIONS.examHome}
          theme="teacher"
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
