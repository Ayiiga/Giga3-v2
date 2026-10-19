"use client";

import { ExamPracticeCentre } from "@/components/gigalearn/exam/ExamPracticeCentre";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";

export function ExamPracticePageRoot() {
  return (
    <ConvexAppShell>
      <ExamPracticeCentre />
    </ConvexAppShell>
  );
}
