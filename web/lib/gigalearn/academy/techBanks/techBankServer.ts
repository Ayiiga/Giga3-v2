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
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], rand: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function selectTechQuestionIds(args: {
  courseSlug: string;
  mode: TechPracticeMode;
  topicId?: string;
  count: number;
  seed: number;
  revisionQuestionIds?: string[];
}): string[] {
  const count = Math.max(1, Math.min(50, Math.floor(args.count)));
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
  answers: Record<string, number>;
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
    const selected =
      typeof args.answers[id] === "number" && Number.isInteger(args.answers[id])
        ? args.answers[id]
        : null;
    if (!q || !isScorableReviewStatus(q.reviewStatus)) {
      return {
        questionId: id,
        selectedIndex: selected,
        correctIndex: -1,
        correct: false,
        explanation:
          "This item is awaiting review and was not scored as an approved answer key.",
        questionText: q?.questionText ?? "Unavailable",
        options: q?.options ?? [],
      };
    }
    const provisional = q.reviewStatus === "pending_review";
    const correct = selected === q.correctIndex;
    return {
      questionId: id,
      selectedIndex: selected,
      correctIndex: q.correctIndex,
      correct,
      explanation: provisional
        ? `Provisional key (pending review). ${q.explanation}`
        : q.explanation,
      questionText: q.questionText,
      options: q.options,
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
