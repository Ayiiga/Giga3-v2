import type { UsageSnapshot } from "./constants";

export function formatExpiry(expiresAt: number | null): string {
  if (!expiresAt) return "—";
  return new Date(expiresAt).toLocaleDateString("en-GH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function planDisplayName(plan: string): string {
  const names: Record<string, string> = {
    free: "Free",
    basic: "Basic",
    pro: "Pro",
    premium: "Premium",
  };
  return names[plan] ?? plan;
}

export function creditsLow(usage: UsageSnapshot, threshold = 10): boolean {
  return usage.credits <= threshold;
}
