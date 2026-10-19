/**
 * Exam Practice Centre — Phase B config (landing only).
 * Source classifications from docs/gigalearn-exam-practice-centre-phase0-audit.md.
 * No question bank; no fabricated BECE papers.
 */

export const EXAM_PRACTICE_CENTRE_TITLE = "GigaLearn Exam Practice Centre";

export const EXAM_PRACTICE_CENTRE_TAGLINE =
  "Practise smarter. Understand your mistakes. Prepare with confidence.";

/** Honest BECE empty copy — Phase 0 found zero BECE papers in uploads. */
export const BECE_AWAITING_MATERIALS_MESSAGE =
  "BECE practice materials are being prepared.";

/**
 * Promotion ranks from the 2026 GES PS→DD advert (metadata only).
 * Labels for future banks — not claims that questions are published per rank.
 */
export const TEACHER_PROMOTION_LEVEL_LABELS = [
  { id: "deputy-director", label: "Deputy Director" },
  { id: "assistant-director-i", label: "Assistant Director I" },
  { id: "assistant-director-ii", label: "Assistant Director II" },
  { id: "principal-superintendent", label: "Principal Superintendent" },
] as const;

/**
 * Teacher-promotion source inventory (Phase 0). Not imported in Phase B.
 * answerStatus describes source state before human verification.
 */
export const TEACHER_PROMOTION_SOURCE_INVENTORY = [
  {
    id: "capsules-2022",
    title: "GES Capsules Promotion Aptitude Quiz (2022)",
    answerStatus: "source_provided_needs_review" as const,
  },
  {
    id: "benito-2025",
    title: "Benito Promotions Final Super Mock (2025)",
    answerStatus: "partial_awaiting_verification" as const,
  },
  {
    id: "ad2-2023",
    title: "AD2 Promotion Aptitude Q&A (28 Feb 2023)",
    answerStatus: "source_provided_needs_review" as const,
  },
  {
    id: "solved-aug-2024",
    title: "Solved Final Mock (August 2024)",
    answerStatus: "source_provided_needs_review" as const,
  },
] as const;

/** Verified deep-links only — existing GigaLearn experiences. */
export const EXAM_PRACTICE_DESTINATIONS = {
  examHome: "/gigalearn/exam/",
  /** Timed Teacher Promotion free orientation practice (not an official GES paper). */
  promotionFreePractice: "/gigalearn/exam/practice/",
  academy: "/gigalearn/academy/",
  academyAssess: "/gigalearn/academy/assess/",
  academyMy: "/gigalearn/academy/my/",
  studentLearn: "/gigalearn/?tab=learn",
  aiTutor: "/gigalearn/?tab=tutor",
  /** Intent query helps Teacher hub open practice tools (not a new bank). */
  teacherHub: "/gigalearn/?tab=teacher&intent=promotion-practice",
  revision: "/gigalearn/?tab=revision",
  gigalearnHome: "/gigalearn/",
  credits: "/credits/",
  pricing: "/pricing/",
} as const;

/**
 * BECE subjects placeholder — empty until verified papers arrive.
 * UI can map this list later without redesigning the centre card.
 */
export const BECE_SUBJECTS_AVAILABLE: ReadonlyArray<{
  id: string;
  label: string;
  questionCount?: number;
}> = [];

export function answerStatusLabel(
  status:
    | "source_provided_needs_review"
    | "partial_awaiting_verification"
    | "verified"
    | "ai_generated"
): string {
  switch (status) {
    case "verified":
      return "Verified answer key";
    case "ai_generated":
      return "AI-generated practice (not an official paper)";
    case "partial_awaiting_verification":
      return "Source answers incomplete — awaiting verification";
    case "source_provided_needs_review":
    default:
      return "Source-provided answers — review required before use";
  }
}
