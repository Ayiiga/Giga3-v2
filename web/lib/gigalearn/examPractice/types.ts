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
  /** Optional per-option why-correct / why-incorrect notes (A–D). */
  optionExplanations?: Partial<Record<ExamPracticeOptionId, string>>;
};

export type ExamPracticeSetMeta = {
  id: string;
  title: string;
  subtitle: string;
  /** Pill / scope label on landing (e.g. rank-unspecified notice) */
  freeLabel: string;
  /** Exam Centre banner H2 when this set is featured */
  centreHeading?: string;
  /** Welcome line on the Exam Centre banner */
  welcomeMessage?: string;
  /** Primary start CTA label */
  startCta?: string;
  questionCount: number;
  /** Minutes for timed free practice */
  durationMinutes: number;
  /** Honest provenance — never “official GES paper” */
  provenanceNote: string;
  category: "teacher_promotion" | "bece";
};
