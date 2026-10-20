/**
 * Exam Practice Centre — landing config + honest bank inventory.
 * BECE / Teacher Promotion interactive banks live under Academy tech practice.
 * No fabricated WAEC papers; AD II study guide has no extractable MCQs.
 */

import { getExamBankMeta } from "@/lib/gigalearn/examPractice/examBankMeta";

export const EXAM_PRACTICE_CENTRE_TITLE = "GigaLearn Exam Practice Centre";

export const EXAM_PRACTICE_CENTRE_TAGLINE =
  "Practise smarter. Understand your mistakes. Prepare with confidence.";

/** Kept for copy when a bank is empty; BECE bank is now imported. */
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
 * Teacher-promotion source inventory.
 * answerStatus describes source state before / during human verification.
 */
export const TEACHER_PROMOTION_SOURCE_INVENTORY = [
  {
    id: "ges-teachers-promotion-500",
    title: "GES Teachers Promotion 500 Objective Questions Explained",
    answerStatus: "partial_awaiting_verification" as const,
  },
  {
    id: "ad2-study-guide-2026",
    title: "Attractive GES Assistant Director II Study Guide 2026",
    answerStatus: "partial_awaiting_verification" as const,
  },
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
  /** Imported BECE objective bank (interactive Academy practice). */
  becePractice: "/gigalearn/academy/tech/?course=exam-bece-prep&count=50",
  beceTimed: "/gigalearn/academy/tech/?course=exam-bece-prep&mode=timed&count=50",
  /** Full BECE pack — server clamps to 50 without subscription/credits. */
  becePracticeFull:
    "/gigalearn/academy/tech/?course=exam-bece-prep&mode=practice_test&count=500",
  beceCourse: "/gigalearn/academy/course/?slug=exam-bece-prep",
  /** Imported Teacher Promotion aptitude bank. */
  teacherPromotionPractice:
    "/gigalearn/academy/tech/?course=exam-teacher-promotion&count=50",
  teacherPromotionLearn:
    "/gigalearn/academy/tech/?course=exam-teacher-promotion&mode=learn&count=50",
  /** Full promotion pack — server clamps to 50 without subscription/credits. */
  teacherPromotionPracticeFull:
    "/gigalearn/academy/tech/?course=exam-teacher-promotion&mode=practice_test&count=500",
  teacherPromotionCourse: "/gigalearn/academy/course/?slug=exam-teacher-promotion",
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

const beceMeta = getExamBankMeta("exam-bece-prep");
const teacherMeta = getExamBankMeta("exam-teacher-promotion");
const ad2Meta = getExamBankMeta("exam-ad2-study-guide");

/**
 * BECE subjects from the imported preparation bank (not official WAEC papers).
 */
export const BECE_SUBJECTS_AVAILABLE: ReadonlyArray<{
  id: string;
  label: string;
  questionCount?: number;
}> = (beceMeta?.topics ?? []).map((t) => ({
  id: t.id,
  label: t.label,
  questionCount: t.questionCount,
}));

export const BECE_BANK_SUMMARY = {
  available: (beceMeta?.approvedQuestionCount ?? 0) > 0,
  approvedCount: beceMeta?.approvedQuestionCount ?? 0,
  pendingCount: beceMeta?.pendingQuestionCount ?? 0,
  sourceDocument: beceMeta?.sourceDocument ?? null,
} as const;

export const TEACHER_PROMOTION_BANK_SUMMARY = {
  available:
    (teacherMeta?.approvedQuestionCount ?? 0) +
      (teacherMeta?.pendingQuestionCount ?? 0) >
    0,
  approvedCount: teacherMeta?.approvedQuestionCount ?? 0,
  pendingCount: teacherMeta?.pendingQuestionCount ?? 0,
  sourceDocument: teacherMeta?.sourceDocument ?? null,
} as const;

export const AD2_STUDY_GUIDE_SUMMARY = {
  available: false,
  approvedCount: ad2Meta?.approvedQuestionCount ?? 0,
  pendingCount: ad2Meta?.pendingQuestionCount ?? 0,
  note: "Study guide only — no extractable A–D MCQs imported (not invented).",
  sourceDocument: ad2Meta?.sourceDocument ?? null,
} as const;

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
