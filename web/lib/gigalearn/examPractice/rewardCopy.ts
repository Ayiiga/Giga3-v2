/** Short praise shown when a learner answers correctly. */

const CORRECT_REWARDS = [
  "EXCELLENT!",
  "SUPERB!",
  "OUTSTANDING!",
  "PROFICIENT!",
  "CORRECT — KEEP IT UP!",
  "WELL DONE!",
] as const;

const INCORRECT_REWARDS = [
  "NOT QUITE — REVIEW THE EXPLANATION.",
  "KEEP PRACTISING!",
  "YOU CAN DO BETTER!",
] as const;

const STREAK_REWARDS: Record<number, string> = {
  3: "SUPERB! — 3 in a row!",
  5: "EXCELLENT! — 5 correct in a row!",
  10: "OUTSTANDING! — 10 streak!",
};

export function rewardForCorrectAnswer(args: {
  streak: number;
  seed?: number;
}): string {
  const streakLine = STREAK_REWARDS[args.streak];
  if (streakLine) return streakLine;
  const idx =
    Math.abs((args.seed ?? args.streak * 17 + 3) % CORRECT_REWARDS.length);
  return CORRECT_REWARDS[idx] ?? "EXCELLENT!";
}

export function rewardForIncorrectAnswer(args?: { seed?: number }): string {
  const idx = Math.abs((args?.seed ?? 0) % INCORRECT_REWARDS.length);
  return INCORRECT_REWARDS[idx] ?? "KEEP PRACTISING!";
}

export function rewardForSessionScore(percent: number): string | null {
  if (percent >= 90) return "OUTSTANDING! — keep revising with purpose.";
  if (percent >= 75) return "SUPERB! — you are building strong exam habits.";
  if (percent >= 60) return "PROFICIENT! — review the misses and try again.";
  if (percent >= 40) return "KEEP PRACTISING! — review explanations carefully.";
  return "YOU CAN DO BETTER! — revisit weak topics and try again.";
}


/** Encouragement for an attempted item whose answer key is still awaiting review.
 * This is not a correctness reward and must not advance a verified-answer streak.
 */
export function rewardForPracticeAttempt(args?: { seed?: number }): string {
  const messages = [
    "GOOD EFFORT! Your answer is saved — keep learning.",
    "KEEP GOING! Every question is a chance to improve.",
    "STAY FOCUSED! Your practice progress is saved.",
  ] as const;
  const idx = Math.abs((args?.seed ?? 0) % messages.length);
  return messages[idx] ?? messages[0];
}
