import type { SocialCommunity } from "@/lib/gigasocial/types";

export type CommunityDiscoveryContext = {
  interests?: string[];
  countryHint?: string;
  regionHint?: string;
  languageHint?: string;
  schoolHint?: string;
  followedTopics?: string[];
  recentActivitySlugs?: string[];
};

function scoreCommunity(community: SocialCommunity, ctx: CommunityDiscoveryContext): number {
  let score = community.memberCount * 0.05;
  if (community.joined) score += 8;

  const hay = `${community.name} ${community.category} ${community.description} ${
    community.communityType ?? ""
  }`.toLowerCase();

  for (const interest of ctx.interests ?? []) {
    const needle = interest.trim().toLowerCase();
    if (needle && hay.includes(needle)) score += 12;
  }
  for (const topic of ctx.followedTopics ?? []) {
    if (topic && hay.includes(topic.toLowerCase())) score += 6;
  }
  if (ctx.countryHint && hay.includes(ctx.countryHint.toLowerCase())) score += 4;
  if (ctx.regionHint && hay.includes(ctx.regionHint.toLowerCase())) score += 3;
  if (ctx.languageHint && hay.includes(ctx.languageHint.toLowerCase())) score += 3;
  if (ctx.schoolHint && hay.includes(ctx.schoolHint.toLowerCase())) score += 10;
  if (ctx.recentActivitySlugs?.includes(community.slug)) score += 5;

  // Light boost for Africa-relevant collaboration spaces
  if (/\b(africa|local|school|church|farm|student|teacher)\b/.test(hay)) score += 2;

  return score;
}

export function rankCommunitiesForDiscovery(
  communities: SocialCommunity[],
  ctx: CommunityDiscoveryContext = {}
): SocialCommunity[] {
  return [...communities].sort(
    (a, b) => scoreCommunity(b, ctx) - scoreCommunity(a, ctx) || b.memberCount - a.memberCount
  );
}

export function suggestCommunities(
  communities: SocialCommunity[],
  ctx: CommunityDiscoveryContext,
  limit = 6
): SocialCommunity[] {
  return rankCommunitiesForDiscovery(communities, ctx)
    .filter((c) => !c.joined)
    .slice(0, limit);
}
