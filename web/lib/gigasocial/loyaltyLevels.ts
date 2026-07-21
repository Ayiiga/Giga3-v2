/** User loyalty ladder — display mapping over existing XP / engagement. */

export type LoyaltyLevelId =
  | "explorer"
  | "contributor"
  | "creator"
  | "influencer"
  | "leader"
  | "legend";

export type LoyaltyLevelDef = {
  id: LoyaltyLevelId;
  label: string;
  minXp: number;
  unlocks: string[];
};

export const LOYALTY_LEVELS: LoyaltyLevelDef[] = [
  {
    id: "explorer",
    label: "Explorer",
    minXp: 0,
    unlocks: ["Basic badges", "Community join"],
  },
  {
    id: "contributor",
    label: "Contributor",
    minXp: 50,
    unlocks: ["Profile frames", "Extra AI captions"],
  },
  {
    id: "creator",
    label: "Creator",
    minXp: 150,
    unlocks: ["AI credit boosts", "Premium templates"],
  },
  {
    id: "influencer",
    label: "Influencer",
    minXp: 400,
    unlocks: ["Profile decorations", "Challenge entry"],
  },
  {
    id: "leader",
    label: "Leader",
    minXp: 900,
    unlocks: ["Moderator tools preview", "Weekly rewards"],
  },
  {
    id: "legend",
    label: "Legend",
    minXp: 2000,
    unlocks: ["Legacy badge", "Special features"],
  },
];

export function resolveLoyaltyLevel(xp: number): LoyaltyLevelDef {
  const safe = Math.max(0, Math.floor(xp || 0));
  let current = LOYALTY_LEVELS[0];
  for (const level of LOYALTY_LEVELS) {
    if (safe >= level.minXp) current = level;
  }
  return current;
}

export function nextLoyaltyLevel(xp: number): LoyaltyLevelDef | null {
  const current = resolveLoyaltyLevel(xp);
  const index = LOYALTY_LEVELS.findIndex((l) => l.id === current.id);
  return LOYALTY_LEVELS[index + 1] ?? null;
}

export function loyaltyProgressPercent(xp: number): number {
  const current = resolveLoyaltyLevel(xp);
  const next = nextLoyaltyLevel(xp);
  if (!next) return 100;
  const span = next.minXp - current.minXp;
  if (span <= 0) return 100;
  return Math.min(100, Math.round(((xp - current.minXp) / span) * 100));
}
