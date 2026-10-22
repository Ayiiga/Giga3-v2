/**
 * Client-safe Exam Practice bank metadata (no answer keys).
 */
import examMetaJson from "@/lib/gigalearn/examPractice/banks/meta.json";
import type { TechCourseMeta, TechTopicMeta } from "@/lib/gigalearn/academy/techBanks/techBankTypes";

export type ExamBankMeta = {
  bankId: string;
  courseSlug: string;
  title: string;
  sourceDocument: string;
  approvedQuestionCount: number;
  pendingQuestionCount: number;
  topics: TechTopicMeta[];
};

const BANKS = (examMetaJson.banks || []) as ExamBankMeta[];

export function listExamBankMeta(): ExamBankMeta[] {
  return BANKS;
}

export function getExamBankMeta(courseSlug: string): ExamBankMeta | undefined {
  const slug = courseSlug.trim().toLowerCase();
  return BANKS.find((b) => b.courseSlug === slug);
}

/** Adapt exam bank meta to the Technology Hub practice summary shape. */
export function examBankAsTechCourseMeta(bank: ExamBankMeta): TechCourseMeta {
  const published = bank.approvedQuestionCount + bank.pendingQuestionCount;
  return {
    bankId: bank.bankId,
    courseSlug: bank.courseSlug,
    title: bank.title,
    difficulty: "intermediate",
    awaitingMaterials: published === 0,
    sourceDocument: bank.sourceDocument,
    // Honest published count — do not claim PDF filenames imply 500 verified items.
    extractedFromSource: published,
    approvedQuestionCount: published,
    topics: bank.topics,
  };
}

export function examPracticeHref(
  courseSlug: string,
  opts?: { mode?: string; topic?: string }
): string {
  const params = new URLSearchParams();
  params.set("course", courseSlug);
  if (opts?.mode) params.set("mode", opts.mode);
  if (opts?.topic) params.set("topic", opts.topic);
  return `/gigalearn/academy/tech/?${params.toString()}`;
}
