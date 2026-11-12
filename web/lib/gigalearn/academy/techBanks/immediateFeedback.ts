import type { TechPracticeMode } from "@/lib/gigalearn/academy/techBanks/techBankTypes";

/** Practice reveals feedback after each answer. Timed exams reveal it at submission. */
export function techModeShowsImmediateFeedback(mode: TechPracticeMode): boolean {
  return mode !== "timed";
}
