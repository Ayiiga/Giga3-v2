/**
 * Phase 3 lightweight achievements + encouraging streaks (additive).
 *
 * Stored separately from the Phase 2 achievement list (which is untouched);
 * the dashboard merges both for display. Learning stays primary — no
 * excessive gamification, and streaks never shame a missed day.
 */
import { getSignals } from "@/lib/gigalearn/signals";
import { getProgressSnapshot } from "@/lib/gigalearn/workspace";

export interface AdaptiveAchievement {
  id: string;
  label: string;
  description: string;
  earnedAt: number;
}

const STORE_KEY = "giga3_gigalearn_adaptive_achievements";

function readStored(): AdaptiveAchievement[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const list = raw ? (JSON.parse(raw) as AdaptiveAchievement[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeStored(list: AdaptiveAchievement[]): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch {
    /* quota */
  }
}

export function getAdaptiveAchievements(): AdaptiveAchievement[] {
  return readStored();
}

interface AchievementCheck {
  id: string;
  label: string;
  description: string;
  earned: boolean;
}

function evaluate(): AchievementCheck[] {
  const signals = getSignals();
  const progress = getProgressSnapshot();
  const correct = signals.filter((s) => s.correct === true || (s.score != null && s.score >= 70)).length;
  const quizzes = signals.filter((s) => s.type === "quiz").length;
  const lessons = signals.filter((s) => s.type === "lesson-completed").length;
  const reviews = signals.filter((s) => s.type === "flashcard-review").length;
  const practiceDays = new Set(signals.map((s) => new Date(s.at).toISOString().slice(0, 10))).size;
  return [
    {
      id: "first-lesson",
      label: "First Lesson Completed",
      description: "Finished your first lesson activity",
      earned: lessons >= 1 || progress.lessonsCreated >= 1,
    },
    {
      id: "first-quiz",
      label: "First Quiz Completed",
      description: "Completed your first quiz",
      earned: quizzes >= 1 || progress.quizzesCompleted >= 1,
    },
    {
      id: "five-correct",
      label: "5 Questions Correct",
      description: "Answered 5 questions correctly",
      earned: correct >= 5,
    },
    {
      id: "topic-reviewed",
      label: "Topic Reviewed",
      description: "Reviewed a topic with flashcards",
      earned: reviews >= 1,
    },
    {
      id: "practice-streak-3",
      label: "Practice Streak",
      description: "Practiced on 3 different days — steady progress",
      earned: practiceDays >= 3,
    },
    {
      id: "flashcard-mastery",
      label: "Flashcard Mastery",
      description: "Mastered every card in a deck",
      earned: reviews >= 5,
    },
    {
      id: "revision-milestone",
      label: "Revision Milestone",
      description: "Completed 10 learning activities",
      earned: signals.length >= 10,
    },
  ];
}

/** Earn newly unlocked achievements (idempotent). */
export function syncAdaptiveAchievements(): AdaptiveAchievement[] {
  const existing = readStored();
  const known = new Set(existing.map((a) => a.id));
  const now = Date.now();
  const next = [...existing];
  for (const check of evaluate()) {
    if (check.earned && !known.has(check.id)) {
      next.push({ id: check.id, label: check.label, description: check.description, earnedAt: now });
    }
  }
  writeStored(next);
  return next;
}

export interface StreakInfo {
  dailyStreak: number;
  activeDaysThisWeek: number;
  message: string;
}

/** Encouraging streaks — never punitive, never shaming. */
export function getStreakInfo(now = Date.now()): StreakInfo {
  const progress = getProgressSnapshot();
  const dailyCounts = progress.dailyCounts ?? {};
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    days.push(d);
  }
  const activeDaysThisWeek = days.filter((d) => (dailyCounts[d] ?? 0) > 0).length;
  let dailyStreak = 0;
  for (const d of days) {
    if ((dailyCounts[d] ?? 0) > 0) dailyStreak += 1;
    else break;
  }
  const message =
    dailyStreak >= 3
      ? `${dailyStreak}-day streak — wonderful consistency. Every day counts, and rest days are fine too.`
      : activeDaysThisWeek > 0
        ? "Nice — you have studied this week. A little each day goes a long way."
        : "Fresh start whenever you are ready — even a 5-minute review counts.";
  return { dailyStreak, activeDaysThisWeek, message };
}
