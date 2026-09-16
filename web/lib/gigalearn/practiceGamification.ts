import type { PracticeModeId } from "@/lib/gigalearn/practiceModes";

const BEST_KEY = "giga3_gigalearn_practice_best";
const STREAK_BEST_KEY = "giga3_gigalearn_answer_streak_best";

export type PracticeBestScores = Record<string, number>;

function readBest(): PracticeBestScores {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) ?? "{}") as PracticeBestScores;
  } catch {
    return {};
  }
}

function writeBest(scores: PracticeBestScores): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(scores));
  } catch {
    /* quota */
  }
}

export function computeAnswerStreak(results: Array<{ correct: boolean }>): number {
  let streak = 0;
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i].correct) streak += 1;
    else break;
  }
  return streak;
}

export function getPersonalBest(subject: string): number | null {
  const key = subject.trim().toLowerCase() || "general";
  const score = readBest()[key];
  return typeof score === "number" ? score : null;
}

export function updatePersonalBest(subject: string, score: number): number {
  const key = subject.trim().toLowerCase() || "general";
  const all = readBest();
  const prev = all[key] ?? 0;
  const next = Math.max(prev, score);
  all[key] = next;
  writeBest(all);
  return next;
}

export function getBestAnswerStreak(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(STREAK_BEST_KEY);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

export function updateBestAnswerStreak(streak: number): number {
  const prev = getBestAnswerStreak();
  const next = Math.max(prev, streak);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STREAK_BEST_KEY, String(next));
    } catch {
      /* ignore */
    }
  }
  return next;
}

export type SessionBadge = {
  id: string;
  label: string;
  description: string;
};

export function sessionBadges(args: {
  score: number;
  streak: number;
  mode: PracticeModeId;
  isNewBest: boolean;
}): SessionBadge[] {
  const badges: SessionBadge[] = [];
  if (args.score >= 85) {
    badges.push({
      id: "strong",
      label: "Strong session",
      description: "You showed solid understanding today.",
    });
  }
  if (args.streak >= 3) {
    badges.push({
      id: "streak",
      label: `${args.streak} in a row`,
      description: "Nice answer streak — keep the momentum!",
    });
  }
  if (args.mode === "mission") {
    badges.push({
      id: "mission",
      label: "Mission complete",
      description: "You finished a full learning mission.",
    });
  }
  if (args.isNewBest) {
    badges.push({
      id: "personal_best",
      label: "Personal best",
      description: "Your highest score for this subject so far.",
    });
  }
  return badges;
}

export function masteryLabel(score: number): string {
  if (score >= 85) return "Strong";
  if (score >= 70) return "Improving";
  if (score >= 50) return "Practicing";
  return "Keep going";
}
