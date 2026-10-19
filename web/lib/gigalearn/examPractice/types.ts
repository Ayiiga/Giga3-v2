/** Shared Exam Practice quiz types — presentation + local practice only. */

export type ExamPracticeOptionId = "A" | "B" | "C" | "D";

export type ExamPracticeQuestion = {
  id: string;
  /** Short topic chip shown above the stem */
  topic: string;
  /** Optional second chip (e.g. “Both”) */
  audience?: string;
  stem: string;
  options: Record<ExamPracticeOptionId, string>;
  correct: ExamPracticeOptionId;
  explanation: string;
};

export type ExamPracticeSetMeta = {
  id: string;
  title: string;
  subtitle: string;
  /** Shown on landing CTA */
  freeLabel: string;
  questionCount: number;
  /** Minutes for timed free practice */
  durationMinutes: number;
  /** Honest provenance — never “official GES paper” */
  provenanceNote: string;
  category: "teacher_promotion" | "bece";
};
