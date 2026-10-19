"use client";

import { ExamQuizSession } from "@/components/gigalearn/exam/ExamQuizSession";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import {
  getPromotionFreeQuestions,
  PROMOTION_FREE_SET_META,
} from "@/lib/gigalearn/examPractice/promotionOrientationBank";
import { EXAM_PRACTICE_DESTINATIONS } from "@/lib/gigalearn/examPractice/centreConfig";
import { useMemo } from "react";

export function ExamPracticeSessionRoot() {
  const questions = useMemo(() => getPromotionFreeQuestions(), []);
  return (
    <ConvexAppShell>
      <ExamQuizSession
        meta={PROMOTION_FREE_SET_META}
        questions={questions}
        exitHref={EXAM_PRACTICE_DESTINATIONS.examHome}
        theme="teacher"
      />
    </ConvexAppShell>
  );
}
