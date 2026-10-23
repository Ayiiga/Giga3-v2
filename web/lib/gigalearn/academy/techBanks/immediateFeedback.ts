import type { TechPracticeMode } from "@/lib/gigalearn/academy/techBanks/techBankTypes";

/**
 * Modes that return per-answer feedback + praise after each submit.
 * Timed exams withhold keys until finish/auto-submit (exam integrity).
 *
 * Premium "Full pack" and Practice test use this path so learners see
 * correct/incorrect marks and option notes immediately — matching free
 * Learn mode — while still producing an end-of-session scorecard.
 */
export function techModeShowsImmediateFeedback(mode: TechPracticeMode): boolean {
  return mode === "learn" || mode === "practice_test";
}
