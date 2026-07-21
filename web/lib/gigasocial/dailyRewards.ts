/** Daily / weekly rewards — local progress with graceful server sync later. */

const STORAGE_KEY = "giga3_gigasocial_daily_rewards";

export type DailyRewardState = {
  lastClaimDate: string | null;
  streakDays: number;
  totalClaims: number;
  weeklyChallengeProgress: number;
};

export type RewardKind =
  | "daily-login"
  | "daily-creator-bonus"
  | "weekly-challenge"
  | "monthly-achievement"
  | "ai-credits"
  | "community-reward";

export const REWARD_CATALOG: { id: RewardKind; label: string; emoji: string; credits: number }[] =
  [
    { id: "daily-login", label: "Daily login", emoji: "🌅", credits: 2 },
    { id: "daily-creator-bonus", label: "Daily Creator Bonus", emoji: "✨", credits: 3 },
    { id: "weekly-challenge", label: "Weekly Challenges", emoji: "🏆", credits: 10 },
    { id: "monthly-achievement", label: "Monthly Achievements", emoji: "🎖", credits: 25 },
    { id: "ai-credits", label: "AI Credit Rewards", emoji: "✦", credits: 5 },
    { id: "community-reward", label: "Community Rewards", emoji: "🌍", credits: 4 },
  ];

function todayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function yesterdayKey(now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function loadDailyRewardState(): DailyRewardState {
  if (typeof window === "undefined") {
    return {
      lastClaimDate: null,
      streakDays: 0,
      totalClaims: 0,
      weeklyChallengeProgress: 0,
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        lastClaimDate: null,
        streakDays: 0,
        totalClaims: 0,
        weeklyChallengeProgress: 0,
      };
    }
    return JSON.parse(raw) as DailyRewardState;
  } catch {
    return {
      lastClaimDate: null,
      streakDays: 0,
      totalClaims: 0,
      weeklyChallengeProgress: 0,
    };
  }
}

export function saveDailyRewardState(state: DailyRewardState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function canClaimDailyLogin(state: DailyRewardState, now = new Date()): boolean {
  return state.lastClaimDate !== todayKey(now);
}

export function claimDailyLogin(state: DailyRewardState, now = new Date()): DailyRewardState {
  if (!canClaimDailyLogin(state, now)) return state;
  const today = todayKey(now);
  const streak = state.lastClaimDate === yesterdayKey(now) ? state.streakDays + 1 : 1;
  const next: DailyRewardState = {
    lastClaimDate: today,
    streakDays: streak,
    totalClaims: state.totalClaims + 1,
    weeklyChallengeProgress: Math.min(7, state.weeklyChallengeProgress + 1),
  };
  saveDailyRewardState(next);
  return next;
}

export function dailyRewardMessage(state: DailyRewardState): string {
  if (!state.lastClaimDate) return "Claim today's login reward to start your streak.";
  return `Streak: ${state.streakDays} day${state.streakDays === 1 ? "" : "s"} · ${state.totalClaims} claims`;
}
