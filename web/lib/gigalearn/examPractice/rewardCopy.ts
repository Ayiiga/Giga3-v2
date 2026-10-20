/** Short praise shown when a learner answers correctly. */

const CORRECT_REWARDS = [
  "Excellent!",
  "Superb!",
  "Brilliant!",
  "Well done!",
  "Outstanding!",
  "Great job!",
  "Keep it up!",
  "Fantastic!",
] as const;

const STREAK_REWARDS: Record<number, string> = {
  3: "Superb streak — 3 in a row!",
  5: "Excellent — 5 correct in a row!",
  10: "Outstanding — 10 streak!",
};

export function rewardForCorrectAnswer(args: {
  streak: number;
  seed?: number;
}): string {
  const streakLine = STREAK_REWARDS[args.streak];
  if (streakLine) return streakLine;
  const idx =
    Math.abs((args.seed ?? args.streak * 17 + 3) % CORRECT_REWARDS.length);
  return CORRECT_REWARDS[idx] ?? "Excellent!";
}

export function rewardForSessionScore(percent: number): string | null {
  if (percent >= 90) return "Outstanding result — keep revising!";
  if (percent >= 75) return "Superb score — you are building strong habits.";
  if (percent >= 60) return "Excellent effort — review the misses and try again.";
  return null;
}
