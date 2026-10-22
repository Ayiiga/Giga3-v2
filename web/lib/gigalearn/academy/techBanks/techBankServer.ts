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
import {
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
};

/** Exam Practice banks allow pending_review items with provisional feedback. */
const INCLUDE_PENDING_SLUGS = new Set([
  "exam-bece-prep",
  "exam-teacher-promotion",
]);

export function listLoadedTechBankSlugs(): string[] {
  return Object.keys(BANKS);
}

export function getTechBankQuestions(
  courseSlug: string,
  opts?: { approvedOnly?: boolean; topicId?: string; includePending?: boolean }
): TechBankQuestion[] {
  const slug = courseSlug.trim().toLowerCase();
  const bank = BANKS[slug];
  if (!bank) return [];
  let rows = bank.questions;
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
  return rows;
}

export function getTechBankQuestionById(
  courseSlug: string,
  questionId: string
): TechBankQuestion | undefined {
  return getTechBankQuestions(courseSlug, { approvedOnly: false }).find(
    (q) => q.questionId === questionId
  );
}

export function toPublicTechQuestion(q: TechBankQuestion): TechPublicQuestion {
  return {
    questionId: q.questionId,
    topicId: q.topicId,
    topicLabel: q.topicLabel,
    questionText: q.questionText,
    options: q.options,
    difficulty: q.difficulty,
    sourceQuestionNumber: q.sourceQuestionNumber,
    reviewStatus: q.reviewStatus,
  };
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
  questions: Array<{ questionId: string; options: string[] }>,
  seed: number
): OptionPermutationMap {
  const rand = createSeededRng(seed ^ 0x9e3779b9);
  const out: OptionPermutationMap = {};
  for (const q of questions) {
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

export function selectTechQuestionIds(args: {
  courseSlug: string;
  mode: TechPracticeMode;
  topicId?: string;
  count: number;
  seed: number;
  revisionQuestionIds?: string[];
}): string[] {
  // Exam Practice packs allow up to 500; Technology Hub courses stay within 50.
  // Entitlement clamp (free 50 vs premium 500) is enforced in startTechPracticeSession.
  const hardMax = isExamPracticeCourseSlug(args.courseSlug)
    ? EXAM_PRACTICE_PREMIUM_QUESTION_COUNT
    : TECH_HUB_DEFAULT_MAX_COUNT;
  const count = Math.max(1, Math.min(hardMax, Math.floor(args.count)));
  const rand = mulberry32(args.seed);

  if (args.mode === "revision" && args.revisionQuestionIds?.length) {
    const ids = [...args.revisionQuestionIds];
    shuffleInPlace(ids, rand);
    return ids.slice(0, count);
  }

  let pool = getTechBankQuestions(args.courseSlug, {
    approvedOnly: true,
    topicId: args.mode === "topic" || args.mode === "challenge" ? args.topicId : undefined,
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
    provisional?: boolean;
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
    if (!q || !isScorableReviewStatus(q.reviewStatus)) {
      return {
        questionId: id,
        selectedIndex: selectedDisplay,
        correctIndex: -1,
        correct: false,
        explanation:
          "This item is awaiting review and was not scored as an approved answer key.",
        questionText: q?.questionText ?? "Unavailable",
        options: presented?.options ?? q?.options ?? [],
      };
    }
    const provisional = q.reviewStatus === "pending_review";
    const correct = selectedOriginal === q.correctIndex;
    return {
      questionId: id,
      selectedIndex: selectedDisplay,
      correctIndex: displayCorrect,
      correct,
      explanation: provisional
        ? `Provisional key (pending review). ${q.explanation}`
        : q.explanation,
      questionText: q.questionText,
      options: presented?.options ?? q.options,
      provisional,
    };
  });
  const maxScore = results.length;
  const score = results.filter((r) => r.correct).length;
  return {
    score,
    maxScore,
    percent: maxScore ? Math.round((score / maxScore) * 100) : 0,
    results,
  };
}
