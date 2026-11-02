/**
 * Server-only Technology Learning Hub bank loader.
 * Import from Convex (or Node tests) — do not import from client components.
 */
import type {
  TechBankQuestion,
  TechPracticeMode,
  TechPublicQuestion,
} from "@/lib/gigalearn/academy/techBanks/techBankTypes";
import aiMl from "@/lib/gigalearn/academy/techBanks/ai-ml.json";
import otherDigital from "@/lib/gigalearn/academy/techBanks/other-digital.json";
import robotics from "@/lib/gigalearn/academy/techBanks/robotics.json";
import websitePwa from "@/lib/gigalearn/academy/techBanks/website-pwa.json";
import becePrep from "@/lib/gigalearn/examPractice/banks/bece-prep.json";
import teacherPromotion from "@/lib/gigalearn/examPractice/banks/teacher-promotion.json";
import adIi from "@/lib/gigalearn/examPractice/banks/ad-ii.json";
import adI from "@/lib/gigalearn/examPractice/banks/ad-i.json";
import deputyDirector from "@/lib/gigalearn/examPractice/banks/deputy-director.json";
import directorIi from "@/lib/gigalearn/examPractice/banks/director-ii.json";
import directorI from "@/lib/gigalearn/examPractice/banks/director-i.json";
import wassceEnglish from "@/lib/gigalearn/examPractice/banks/wassce-english.json";
import wassceCoreMathematics from "@/lib/gigalearn/examPractice/banks/wassce-core-mathematics.json";
import wassceIntegratedScience from "@/lib/gigalearn/examPractice/banks/wassce-integrated-science.json";
import wassceSocialStudies from "@/lib/gigalearn/examPractice/banks/wassce-social-studies.json";
import {
  EXAM_PRACTICE_FREE_QUESTION_COUNT,
  EXAM_PRACTICE_PREMIUM_QUESTION_COUNT,
  TECH_HUB_DEFAULT_MAX_COUNT,
  isExamPracticeCourseSlug,
} from "@/lib/gigalearn/examPractice/practiceLimits";
import {
  buildOptionPermutation,
  createSeededRng,
  displayCorrectIndex,
  fisherYatesShuffleInPlace,
  toOriginalOptionIndex,
} from "@/lib/gigalearn/examPractice/optionShuffle";
import {
  sanitizePracticeExplanation,
  sanitizePracticeStem,
} from "@/lib/gigalearn/examPractice/sanitizePracticeStem";

type BankFile = {
  bankId: string;
  courseSlug: string;
  title: string;
  sourceDocument: string;
  questions: TechBankQuestion[];
};

const BANKS: Record<string, BankFile> = {
  [websitePwa.courseSlug]: websitePwa as BankFile,
  [robotics.courseSlug]: robotics as BankFile,
  [otherDigital.courseSlug]: otherDigital as BankFile,
  [aiMl.courseSlug]: aiMl as BankFile,
  [becePrep.courseSlug]: becePrep as BankFile,
  [teacherPromotion.courseSlug]: teacherPromotion as BankFile,
  [adIi.courseSlug]: adIi as BankFile,
  [adI.courseSlug]: adI as BankFile,
  [deputyDirector.courseSlug]: deputyDirector as BankFile,
  [directorIi.courseSlug]: directorIi as BankFile,
  [directorI.courseSlug]: directorI as BankFile,
  [wassceEnglish.courseSlug]: wassceEnglish as BankFile,
  [wassceCoreMathematics.courseSlug]: wassceCoreMathematics as BankFile,
  [wassceIntegratedScience.courseSlug]: wassceIntegratedScience as BankFile,
  [wassceSocialStudies.courseSlug]: wassceSocialStudies as BankFile,
};

/** Exam Practice banks allow pending_review items with provisional feedback. */
const INCLUDE_PENDING_SLUGS = new Set([
  "exam-bece-prep",
  "exam-teacher-promotion",
  "exam-ad-ii",
  "exam-ad-i",
  "exam-deputy-director",
  "exam-director-ii",
  "exam-director-i",
  "exam-wassce-english",
  "exam-wassce-core-mathematics",
  "exam-wassce-integrated-science",
  "exam-wassce-social-studies",
]);

/**
 * Free callers only receive items tagged free (or legacy items with no accessTier).
 * Premium entitlement unlocks free + premium items. Never expose premium stems
 * to free sessions via selection.
 */
export function isTechQuestionAccessible(
  q: TechBankQuestion,
  premiumAccess: boolean
): boolean {
  if (premiumAccess) return true;
  const tiers = q.accessTier;
  if (!tiers || tiers.length === 0) return true;
  return tiers.includes("free");
}

export function listLoadedTechBankSlugs(): string[] {
  return Object.keys(BANKS);
}

export function getTechBankQuestions(
  courseSlug: string,
  opts?: {
    approvedOnly?: boolean;
    topicId?: string;
    includePending?: boolean;
    /** When true, drop premium-only items (backend entitlement gate). */
    freeTierOnly?: boolean;
    /** Filter to MCQ or True/False only. */
    questionType?: "mcq" | "true_false";
  }
): TechBankQuestion[] {
  const slug = courseSlug.trim().toLowerCase();
  const bank = BANKS[slug];
  if (!bank) return [];
  // Defence in depth: a subject session may only draw questions whose
  // embedded courseSlug matches the selected course. This prevents a malformed
  // imported bank from mixing English, Mathematics, or another subject.
  let rows = bank.questions.filter(
    (q) =>
      typeof q.courseSlug === "string" &&
      q.courseSlug.trim().toLowerCase() === slug
  );
  // Retired / draft items stay in JSON for recovery but never enter practice pools.
  rows = rows.filter((q) => {
    const pub = q.publicationStatus;
    return pub == null || pub === "published_practice";
  });
  const includePending = opts?.includePending ?? INCLUDE_PENDING_SLUGS.has(slug);
  if (opts?.approvedOnly === false) {
    // all statuses except rejected
    rows = rows.filter((q) => q.reviewStatus !== "rejected");
  } else if (includePending) {
    rows = rows.filter(
      (q) => q.reviewStatus === "approved" || q.reviewStatus === "pending_review"
    );
  } else {
    rows = rows.filter((q) => q.reviewStatus === "approved");
  }
  if (opts?.topicId) {
    rows = rows.filter((q) => q.topicId === opts.topicId);
  }
  if (opts?.questionType) {
    rows = rows.filter((q) => (q.questionType || "mcq") === opts.questionType);
  }
  if (opts?.freeTierOnly) {
    rows = rows.filter((q) => isTechQuestionAccessible(q, false));
  }
  return rows;
}

export function getTechBankQuestionById(
  courseSlug: string,
  questionId: string
): TechBankQuestion | undefined {
  const slug = courseSlug.trim().toLowerCase();
  return getTechBankQuestions(slug, { approvedOnly: false }).find(
    (q) =>
      typeof q.courseSlug === "string" &&
      q.courseSlug.trim().toLowerCase() === slug &&
      q.questionId === questionId
  );
}

export function toPublicTechQuestion(q: TechBankQuestion): TechPublicQuestion {
  return {
    questionId: q.questionId,
    topicId: q.topicId,
    topicLabel: q.topicLabel,
    questionText: sanitizePracticeStem(q.questionText),
    options: q.options,
    difficulty: q.difficulty,
    sourceQuestionNumber: q.sourceQuestionNumber,
    reviewStatus: q.reviewStatus,
    questionType: q.questionType === "true_false" ? "true_false" : "mcq",
  };
}

/** True/False options stay in fixed True→False order (no Fisher–Yates). */
export function isTrueFalseQuestion(q: {
  questionType?: string;
  options?: readonly string[];
}): boolean {
  if (q.questionType === "true_false") return true;
  if (!q.options || q.options.length !== 2) return false;
  const [a, b] = q.options.map((o) => (o || "").trim().toLowerCase());
  return a === "true" && b === "false";
}

function mulberry32(seed: number): () => number {
  return createSeededRng(seed);
}

function shuffleInPlace<T>(arr: T[], rand: () => number): T[] {
  return fisherYatesShuffleInPlace(arr, rand);
}

/** displayIndex → originalIndex for each question in a practice session. */
export type OptionPermutationMap = Record<string, number[]>;

export function buildSessionOptionPermutations(
  questions: Array<{
    questionId: string;
    options: string[];
    questionType?: string;
  }>,
  seed: number
): OptionPermutationMap {
  const rand = createSeededRng(seed ^ 0x9e3779b9);
  const out: OptionPermutationMap = {};
  for (const q of questions) {
    // Never shuffle True/False — presentation must stay [TRUE] [FALSE].
    if (isTrueFalseQuestion(q)) {
      out[q.questionId] = q.options.map((_, i) => i);
      continue;
    }
    out[q.questionId] = buildOptionPermutation(q.options.length, rand);
  }
  return out;
}

export function presentTechQuestion(
  q: TechBankQuestion,
  permutation?: number[]
): TechPublicQuestion {
  const publicQ = toPublicTechQuestion(q);
  if (!permutation || permutation.length !== q.options.length) return publicQ;
  return {
    ...publicQ,
    options: permutation.map((original) => q.options[original] ?? ""),
  };
}

/** Display-order option notes — never sent before feedback is authorized. */
export function presentOptionExplanations(
  q: TechBankQuestion | null | undefined,
  permutation?: number[]
): string[] | undefined {
  if (!q?.optionExplanations?.length) return undefined;
  if (q.optionExplanations.length !== q.options.length) return undefined;
  const order =
    permutation && permutation.length === q.options.length
      ? permutation
      : q.options.map((_, i) => i);
  return order.map((original) =>
    sanitizePracticeExplanation(q.optionExplanations?.[original] ?? "")
  );
}

export function selectTechQuestionIds(args: {
  courseSlug: string;
  mode: TechPracticeMode;
  topicId?: string;
  count: number;
  seed: number;
  revisionQuestionIds?: string[];
  /** When false, exclude premium-only items from the selection pool. */
  premiumAccess?: boolean;
  /** Optional MCQ / True-False filter for type-specific practice. */
  questionType?: "mcq" | "true_false";
}): string[] {
  // Exam Practice packs allow up to 500; Technology Hub courses stay within 50.
  // Also clamp here when premiumAccess is false so free callers never receive
  // more than EXAM_PRACTICE_FREE_QUESTION_COUNT even if count is overstated
  // (defense in depth alongside startTechPracticeSession).
  const isExam = isExamPracticeCourseSlug(args.courseSlug);
  const hardMax = isExam
    ? args.premiumAccess === false
      ? EXAM_PRACTICE_FREE_QUESTION_COUNT
      : EXAM_PRACTICE_PREMIUM_QUESTION_COUNT
    : TECH_HUB_DEFAULT_MAX_COUNT;
  const count = Math.max(1, Math.min(hardMax, Math.floor(args.count)));
  const rand = mulberry32(args.seed);
  const freeTierOnly = args.premiumAccess === false;

  if (args.mode === "revision" && args.revisionQuestionIds?.length) {
    const allowed = new Set(
      getTechBankQuestions(args.courseSlug, {
        approvedOnly: false,
        freeTierOnly,
        questionType: args.questionType,
      }).map((q) => q.questionId)
    );
    const ids = args.revisionQuestionIds.filter((id) => allowed.has(id));
    shuffleInPlace(ids, rand);
    return ids.slice(0, count);
  }

  let pool = getTechBankQuestions(args.courseSlug, {
    approvedOnly: true,
    topicId: args.mode === "topic" || args.mode === "challenge" ? args.topicId : undefined,
    freeTierOnly,
    questionType: args.questionType,
  });

  if (args.mode === "challenge") {
    pool = pool.filter(
      (q) =>
        /case study|applied|prototype|deployment|responsible|safety/i.test(q.questionText) ||
        q.difficulty !== "beginner"
    );
    if (pool.length < count) {
      pool = getTechBankQuestions(args.courseSlug, {
        approvedOnly: true,
        topicId: args.topicId,
        freeTierOnly,
        questionType: args.questionType,
      });
    }
  }

  const ids = pool.map((q) => q.questionId);
  shuffleInPlace(ids, rand);
  return ids.slice(0, Math.min(count, ids.length));
}

function isScorableReviewStatus(status: TechBankQuestion["reviewStatus"]): boolean {
  return status === "approved" || status === "pending_review";
}

export function gradeTechAnswers(args: {
  courseSlug: string;
  questionIds: string[];
  /** Display indices as chosen by the learner (after option shuffle). */
  answers: Record<string, number>;
  /** Optional display→original permutations stored on the session. */
  optionPermutations?: OptionPermutationMap;
}): {
  score: number;
  maxScore: number;
  percent: number;
  results: Array<{
    questionId: string;
    selectedIndex: number | null;
    correctIndex: number;
    correct: boolean;
    explanation: string;
    questionText: string;
    options: string[];
    /** Display-order notes parallel to `options` (when available). */
    optionExplanations?: string[];
    provisional?: boolean;
    /** Matched the provisional key — never treated as a verified correct score. */
    provisionalMatch?: boolean;
    /** Counts toward session score (approved keys only). */
    scored?: boolean;
  }>;
} {
  const results = args.questionIds.map((id) => {
    const q = getTechBankQuestionById(args.courseSlug, id);
    const perm = args.optionPermutations?.[id];
    const selectedDisplay =
      typeof args.answers[id] === "number" && Number.isInteger(args.answers[id])
        ? args.answers[id]
        : null;
    const selectedOriginal =
      selectedDisplay == null ? null : toOriginalOptionIndex(selectedDisplay, perm);
    const presented = q ? presentTechQuestion(q, perm) : null;
    const displayCorrect = q
      ? displayCorrectIndex(q.correctIndex, perm ?? q.options.map((_, i) => i))
      : -1;
    const displayOptionExplanations = presentOptionExplanations(q, perm);
    const cleanStem = presented?.questionText ?? sanitizePracticeStem(q?.questionText ?? "Unavailable");
    const cleanExplanation = q
      ? sanitizePracticeExplanation(q.explanation)
      : "";
    if (!q || !isScorableReviewStatus(q.reviewStatus)) {
      return {
        questionId: id,
        selectedIndex: selectedDisplay,
        correctIndex: -1,
        correct: false,
        explanation:
          "Answer under review — this item was not scored with a verified answer key.",
        questionText: cleanStem,
        options: presented?.options ?? q?.options ?? [],
        optionExplanations: displayOptionExplanations,
        scored: false,
      };
    }
    const provisional = q.reviewStatus === "pending_review";
    const matchedKey = selectedOriginal === q.correctIndex;
    if (provisional) {
      return {
        questionId: id,
        selectedIndex: selectedDisplay,
        correctIndex: displayCorrect,
        // Never count provisional keys as verified-correct toward score/rewards.
        correct: false,
        explanation: `Answer under review. Provisional key (not human-verified). ${cleanExplanation}`,
        questionText: cleanStem,
        options: presented?.options ?? q.options,
        optionExplanations: displayOptionExplanations,
        provisional: true,
        provisionalMatch: matchedKey,
        scored: false,
      };
    }
    return {
      questionId: id,
      selectedIndex: selectedDisplay,
      correctIndex: displayCorrect,
      correct: matchedKey,
      explanation: cleanExplanation,
      questionText: cleanStem,
      options: presented?.options ?? q.options,
      optionExplanations: displayOptionExplanations,
      provisional: false,
      scored: true,
    };
  });
  const scored = results.filter((r) => r.scored);
  const maxScore = scored.length;
  const score = scored.filter((r) => r.correct).length;
  return {
    score,
    maxScore,
    percent: maxScore ? Math.round((score / maxScore) * 100) : 0,
    results,
  };
}
