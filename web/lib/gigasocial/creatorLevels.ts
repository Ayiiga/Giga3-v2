/** Creator level ladder — display-only mapping over existing XP / level. */

export type CreatorLevelId =
  | "new"
  | "growing"
  | "silver"
  | "gold"
  | "diamond"
  | "legend";

export type CreatorLevelDef = {
  id: CreatorLevelId;
  label: string;
  minLevel: number;
  unlocks: string[];
};

export const CREATOR_LEVELS: CreatorLevelDef[] = [
  {
    id: "new",
    label: "New Creator",
    minLevel: 1,
    unlocks: ["Basic AI captions", "Feed posting"],
  },
  {
    id: "growing",
    label: "Growing Creator",
    minLevel: 3,
    unlocks: ["AI hashtags", "Templates", "Basic analytics"],
  },
  {
    id: "silver",
    label: "Silver",
    minLevel: 5,
    unlocks: ["AI credits boost", "Thumbnail maker", "Audience insights"],
  },
  {
    id: "gold",
    label: "Gold",
    minLevel: 8,
    unlocks: ["Advanced analytics", "Boost campaigns", "Script generator"],
  },
  {
    id: "diamond",
    label: "Diamond",
    minLevel: 12,
    unlocks: ["Monetization tools", "Affiliate marketplace", "Priority AI"],
  },
  {
    id: "legend",
    label: "Legend",
    minLevel: 18,
    unlocks: ["Creator Challenges", "Weekly rewards", "Brand kit"],
  },
];

export function resolveCreatorLevel(xpLevel: number): CreatorLevelDef {
  const level = Math.max(1, Math.floor(xpLevel || 1));
  let current = CREATOR_LEVELS[0];
  for (const def of CREATOR_LEVELS) {
    if (level >= def.minLevel) current = def;
  }
  return current;
}

export function nextCreatorLevel(xpLevel: number): CreatorLevelDef | null {
  const current = resolveCreatorLevel(xpLevel);
  const index = CREATOR_LEVELS.findIndex((d) => d.id === current.id);
  return CREATOR_LEVELS[index + 1] ?? null;
}

export function creatorLevelProgress(xpLevel: number): number {
  const current = resolveCreatorLevel(xpLevel);
  const next = nextCreatorLevel(xpLevel);
  if (!next) return 100;
  const span = next.minLevel - current.minLevel;
  if (span <= 0) return 100;
  const progressed = Math.max(0, xpLevel - current.minLevel);
  return Math.min(100, Math.round((progressed / span) * 100));
}

/** Display ranks derived from fans + engagement — no schema change. */
export function formatCreatorRanks(args: {
  fanCount: number;
  engagementRate: number;
  countryHint?: string;
}): { creatorRank: string; localRank: string; countryRank: string } {
  const fans = args.fanCount ?? 0;
  const eng = args.engagementRate ?? 0;
  let tier = "Rising";
  if (fans >= 10000 || eng >= 8) tier = "Elite";
  else if (fans >= 2500 || eng >= 4) tier = "Established";
  else if (fans >= 500 || eng >= 2) tier = "Emerging";

  const country = args.countryHint?.trim() || "Africa";
  return {
    creatorRank: `${tier} Creator`,
    localRank: fans >= 500 ? "Top Local" : "Local Challenger",
    countryRank: fans >= 2500 ? `Top in ${country}` : `${country} Rising`,
  };
}
