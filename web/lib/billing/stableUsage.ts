import type { UsageSnapshot } from "@/lib/credits/constants";

export function toUsageSnapshot(
  raw: Record<string, unknown> | null | undefined
): UsageSnapshot | null {
  if (!raw) return null;
  return {
    subscriptionPlan:
      (raw.subscriptionPlan as UsageSnapshot["subscriptionPlan"]) ?? "free",
    subscriptionActive: Boolean(raw.subscriptionActive),
    credits: Number(raw.credits ?? 0),
    tokens: Number(raw.tokens ?? 0),
    subscriptionExpiresAt:
      (raw.subscriptionExpiresAt as number | null | undefined) ?? null,
    planLabel: String(raw.planLabel ?? "Free"),
    canGenerateVideo: Boolean(raw.canGenerateVideo),
    creditCosts: raw.creditCosts as UsageSnapshot["creditCosts"],
  };
}

export function usageSnapshotEqual(
  a: UsageSnapshot | null,
  b: UsageSnapshot | null
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.subscriptionPlan === b.subscriptionPlan &&
    a.subscriptionActive === b.subscriptionActive &&
    a.credits === b.credits &&
    a.tokens === b.tokens &&
    a.subscriptionExpiresAt === b.subscriptionExpiresAt &&
    a.planLabel === b.planLabel &&
    a.canGenerateVideo === b.canGenerateVideo &&
    JSON.stringify(a.creditCosts) === JSON.stringify(b.creditCosts)
  );
}
