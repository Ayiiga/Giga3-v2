/**
 * Shareable Exam Practice links for Teacher Promotion and BECE advertising.
 * Uses absolute production URLs so shares work outside the app shell.
 */

import { siteConfig } from "@/lib/site";

export type ExamPracticeShareKind = "teacher_promotion" | "bece";

export function examPracticeShareUrl(kind: ExamPracticeShareKind): string {
  const base = siteConfig.url.replace(/\/$/, "");
  if (kind === "bece") {
    return `${base}/gigalearn/exam/?utm_source=share&utm_campaign=bece-practice#bece-centre`;
  }
  return `${base}/gigalearn/exam/promotion/?utm_source=share&utm_campaign=teacher-promotion`;
}

export function examPracticeShareText(kind: ExamPracticeShareKind): string {
  if (kind === "bece") {
    return `Practise BECE preparation on GigaLearn (Giga3 AI) — free timed practice with progress tracking. Not an official WAEC paper. ${examPracticeShareUrl("bece")}`;
  }
  return `Practise Ghana Teacher Promotion aptitude on GigaLearn (Giga3 AI) — free practice with rewards and progress. Not an official GES paper. ${examPracticeShareUrl("teacher_promotion")}`;
}

export async function shareExamPractice(
  kind: ExamPracticeShareKind
): Promise<"shared" | "copied" | "failed"> {
  const url = examPracticeShareUrl(kind);
  const text = examPracticeShareText(kind);
  const title =
    kind === "bece"
      ? "GigaLearn BECE Practice"
      : "GigaLearn Teacher Promotion Practice";

  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share({ title, text, url });
      return "shared";
    }
  } catch (err) {
    // User cancel should not fall through as failure.
    if (err instanceof DOMException && err.name === "AbortError") return "failed";
  }

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return "copied";
    }
  } catch {
    /* ignore */
  }
  return "failed";
}
