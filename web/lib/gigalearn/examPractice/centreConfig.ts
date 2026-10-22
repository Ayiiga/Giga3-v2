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
 * Promotion ranks shown on the Exam Practice Centre.
 * Interactive banks exist for AD II → Director I; PS remains label-only.
 */
export const TEACHER_PROMOTION_LEVEL_LABELS = [
  { id: "assistant-director-ii", label: "Assistant Director II", courseSlug: "exam-ad-ii" },
  { id: "assistant-director-i", label: "Assistant Director I", courseSlug: "exam-ad-i" },
  { id: "deputy-director", label: "Deputy Director", courseSlug: "exam-deputy-director" },
  { id: "director-ii", label: "Director II", courseSlug: "exam-director-ii" },
  { id: "director-i", label: "Director I", courseSlug: "exam-director-i" },
  { id: "principal-superintendent", label: "Principal Superintendent", courseSlug: null },
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
  /**
   * Primary Teacher Promotion entry — five-rank free-practice selector.
   * Do not send learners to the general Courses tab or mixed bank first.
   */
  promotionRankSelect: "/gigalearn/exam/promotion/",
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
  /** Rank-specific free practice — learn mode so explanations appear after each answer. */
  adIiPractice:
    "/gigalearn/academy/tech/?course=exam-ad-ii&mode=learn&count=50",
  adIiPracticeMcq:
    "/gigalearn/academy/tech/?course=exam-ad-ii&mode=learn&qtype=mcq&count=50",
  adIiPracticeTf:
    "/gigalearn/academy/tech/?course=exam-ad-ii&mode=learn&qtype=true_false&count=50",
  adIiPracticeFull:
    "/gigalearn/academy/tech/?course=exam-ad-ii&mode=practice_test&count=500",
  adIiCourse: "/gigalearn/academy/course/?slug=exam-ad-ii",
  adIPractice: "/gigalearn/academy/tech/?course=exam-ad-i&mode=learn&count=50",
  adIPracticeMcq:
    "/gigalearn/academy/tech/?course=exam-ad-i&mode=learn&qtype=mcq&count=50",
  adIPracticeTf:
    "/gigalearn/academy/tech/?course=exam-ad-i&mode=learn&qtype=true_false&count=50",
  adIPracticeFull:
    "/gigalearn/academy/tech/?course=exam-ad-i&mode=practice_test&count=500",
  adICourse: "/gigalearn/academy/course/?slug=exam-ad-i",
  deputyDirectorPractice:
    "/gigalearn/academy/tech/?course=exam-deputy-director&mode=learn&count=50",
  deputyDirectorPracticeMcq:
    "/gigalearn/academy/tech/?course=exam-deputy-director&mode=learn&qtype=mcq&count=50",
  deputyDirectorPracticeTf:
    "/gigalearn/academy/tech/?course=exam-deputy-director&mode=learn&qtype=true_false&count=50",
  deputyDirectorPracticeFull:
    "/gigalearn/academy/tech/?course=exam-deputy-director&mode=practice_test&count=500",
  deputyDirectorCourse: "/gigalearn/academy/course/?slug=exam-deputy-director",
  directorIiPractice:
    "/gigalearn/academy/tech/?course=exam-director-ii&mode=learn&count=50",
  directorIiPracticeMcq:
    "/gigalearn/academy/tech/?course=exam-director-ii&mode=learn&qtype=mcq&count=50",
  directorIiPracticeTf:
    "/gigalearn/academy/tech/?course=exam-director-ii&mode=learn&qtype=true_false&count=50",
  directorIiPracticeFull:
    "/gigalearn/academy/tech/?course=exam-director-ii&mode=practice_test&count=500",
  directorIiCourse: "/gigalearn/academy/course/?slug=exam-director-ii",
  directorIPractice:
    "/gigalearn/academy/tech/?course=exam-director-i&mode=learn&count=50",
  directorIPracticeMcq:
    "/gigalearn/academy/tech/?course=exam-director-i&mode=learn&qtype=mcq&count=50",
  directorIPracticeTf:
    "/gigalearn/academy/tech/?course=exam-director-i&mode=learn&qtype=true_false&count=50",
  directorIPracticeFull:
    "/gigalearn/academy/tech/?course=exam-director-i&mode=practice_test&count=500",
  directorICourse: "/gigalearn/academy/course/?slug=exam-director-i",
  /** Mixed teacher-promotion bank True/False practice (rank unconfirmed for mock sources). */
  teacherPromotionTf:
    "/gigalearn/academy/tech/?course=exam-teacher-promotion&mode=learn&qtype=true_false&count=50",
  promotionGuidesZip:
    "/downloads/gigalearn/promotion-guides/GigaLearn_Teacher_Promotion_Practice_Guides.zip",
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
const adIiMeta = getExamBankMeta("exam-ad-ii");
const adIMeta = getExamBankMeta("exam-ad-i");
const deputyDirectorMeta = getExamBankMeta("exam-deputy-director");
const directorIiMeta = getExamBankMeta("exam-director-ii");
const directorIMeta = getExamBankMeta("exam-director-i");

/** Per-rank practice target (distinct publishable items — not “550 verified”). */
export const PROMOTION_RANK_TARGET_COUNT = 550;
export const PROMOTION_RANKS_TARGET_TOTAL = PROMOTION_RANK_TARGET_COUNT * 5;

function rankGuideShortCode(courseSlug: string | null | undefined): string | null {
  switch (courseSlug) {
    case "exam-ad-ii":
      return "AD_II";
    case "exam-ad-i":
      return "AD_I";
    case "exam-deputy-director":
      return "DD";
    case "exam-director-ii":
      return "D_II";
    case "exam-director-i":
      return "D_I";
    default:
      return null;
  }
}

function rankBankSummary(meta: ReturnType<typeof getExamBankMeta>) {
  const approved = meta?.approvedQuestionCount ?? 0;
  const pending = meta?.pendingQuestionCount ?? 0;
  const published = approved + pending;
  const mcqCount = meta?.mcqCount ?? published;
  const trueFalseCount = meta?.trueFalseCount ?? 0;
  const types: Array<"mcq" | "true_false"> = [];
  if (mcqCount > 0) types.push("mcq");
  if (trueFalseCount > 0) types.push("true_false");
  const short = rankGuideShortCode(meta?.courseSlug);
  // Primary download uses the honest published count in the filename — never "550"
  // unless that rank genuinely has 550 distinct items.
  const guidePdfHref =
    short && published > 0
      ? `/downloads/gigalearn/promotion-guides/GigaLearn_${short}_${published}_Practice_Questions_Answers.pdf`
      : null;
  return {
    available: published > 0,
    approvedCount: approved,
    pendingCount: pending,
    publishedCount: published,
    mcqCount,
    trueFalseCount,
    questionTypes: types,
    targetCount: PROMOTION_RANK_TARGET_COUNT,
    gapToTarget: Math.max(0, PROMOTION_RANK_TARGET_COUNT - published),
    sourceDocument: meta?.sourceDocument ?? null,
    title: meta?.title ?? null,
    courseSlug: meta?.courseSlug ?? null,
    guidePdfHref,
  } as const;
}

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

/**
 * Five rank-specific practice banks. Counts are published practice items
 * (mostly pending_review / awaiting verification) — not verified official papers
 * and not a claim that each PDF delivered 500 unique questions.
 */
export const PROMOTION_RANK_BANK_SUMMARIES = [
  {
    id: "ad-ii",
    shortLabel: "AD II",
    focus:
      "Classroom practice, educational assessment, curriculum, professional ethics, teaching and learning.",
    practiceHref: EXAM_PRACTICE_DESTINATIONS.adIiPractice,
    mcqHref: EXAM_PRACTICE_DESTINATIONS.adIiPracticeMcq,
    trueFalseHref: EXAM_PRACTICE_DESTINATIONS.adIiPracticeTf,
    fullHref: EXAM_PRACTICE_DESTINATIONS.adIiPracticeFull,
    courseHref: EXAM_PRACTICE_DESTINATIONS.adIiCourse,
    ...rankBankSummary(adIiMeta),
  },
  {
    id: "ad-i",
    shortLabel: "AD I",
    focus:
      "Instructional supervision, staff development, school improvement, operational leadership.",
    practiceHref: EXAM_PRACTICE_DESTINATIONS.adIPractice,
    mcqHref: EXAM_PRACTICE_DESTINATIONS.adIPracticeMcq,
    trueFalseHref: EXAM_PRACTICE_DESTINATIONS.adIPracticeTf,
    fullHref: EXAM_PRACTICE_DESTINATIONS.adIPracticeFull,
    courseHref: EXAM_PRACTICE_DESTINATIONS.adICourse,
    ...rankBankSummary(adIMeta),
  },
  {
    id: "deputy-director",
    shortLabel: "Deputy Director",
    focus:
      "Institutional and district management, monitoring and evaluation, resource accountability.",
    practiceHref: EXAM_PRACTICE_DESTINATIONS.deputyDirectorPractice,
    mcqHref: EXAM_PRACTICE_DESTINATIONS.deputyDirectorPracticeMcq,
    trueFalseHref: EXAM_PRACTICE_DESTINATIONS.deputyDirectorPracticeTf,
    fullHref: EXAM_PRACTICE_DESTINATIONS.deputyDirectorPracticeFull,
    courseHref: EXAM_PRACTICE_DESTINATIONS.deputyDirectorCourse,
    ...rankBankSummary(deputyDirectorMeta),
  },
  {
    id: "director-ii",
    shortLabel: "Director II",
    focus:
      "Strategic planning, governance, policy implementation, institutional performance.",
    practiceHref: EXAM_PRACTICE_DESTINATIONS.directorIiPractice,
    mcqHref: EXAM_PRACTICE_DESTINATIONS.directorIiPracticeMcq,
    trueFalseHref: EXAM_PRACTICE_DESTINATIONS.directorIiPracticeTf,
    fullHref: EXAM_PRACTICE_DESTINATIONS.directorIiPracticeFull,
    courseHref: EXAM_PRACTICE_DESTINATIONS.directorIiCourse,
    ...rankBankSummary(directorIiMeta),
  },
  {
    id: "director-i",
    shortLabel: "Director I",
    focus:
      "Advanced strategic leadership, organisational governance, public-sector accountability.",
    practiceHref: EXAM_PRACTICE_DESTINATIONS.directorIPractice,
    mcqHref: EXAM_PRACTICE_DESTINATIONS.directorIPracticeMcq,
    trueFalseHref: EXAM_PRACTICE_DESTINATIONS.directorIPracticeTf,
    fullHref: EXAM_PRACTICE_DESTINATIONS.directorIPracticeFull,
    courseHref: EXAM_PRACTICE_DESTINATIONS.directorICourse,
    ...rankBankSummary(directorIMeta),
  },
] as const;

export const PROMOTION_RANK_BANKS_TOTAL = {
  published: PROMOTION_RANK_BANK_SUMMARIES.reduce((n, b) => n + b.publishedCount, 0),
  target: PROMOTION_RANKS_TARGET_TOTAL,
  gap: PROMOTION_RANK_BANK_SUMMARIES.reduce((n, b) => n + b.gapToTarget, 0),
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
