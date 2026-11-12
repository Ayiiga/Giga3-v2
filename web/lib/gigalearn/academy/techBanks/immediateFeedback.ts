import type { TechPracticeMode } from "@/lib/gigalearn/academy/techBanks/techBankTypes";

/** All supported practice modes reveal feedback as each objective answer is saved. */
export function techModeShowsImmediateFeedback(mode: TechPracticeMode): boolean {
  return Boolean(mode);
}
