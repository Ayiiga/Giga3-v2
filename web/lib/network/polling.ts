import type { ConnectionTier } from "@/lib/network/connectionQuality";

/** Stretch poll intervals on 2G / save-data to reduce radio wakeups and failed fetches. */
export function getAdaptivePollIntervalMs(
  tier: ConnectionTier,
  baseMs: number
): number {
  if (tier === "offline") return 0;
  if (tier === "slow") return Math.round(baseMs * 2);
  return baseMs;
}

/** Convex HTTP retry count — one extra attempt on slow links. */
export function getConvexRetryCount(tier: ConnectionTier): number {
  return tier === "slow" ? 2 : 1;
}
