import { listSavedPrompts } from "@/lib/chat/savedPrompts";
import { DISCOVER_ITEMS } from "@/lib/trends/discoverCatalog";
import type { DiscoverItem } from "@/lib/trends/discoverCatalog";

const ACTIVITY_KEY = "giga3_trend_activity";

type ActivitySignals = {
  recentTools: string[];
  recentCategories: string[];
  updatedAt: number;
};

function readActivity(): ActivitySignals {
  if (typeof window === "undefined") {
    return { recentTools: [], recentCategories: [], updatedAt: 0 };
  }
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    if (!raw) return { recentTools: [], recentCategories: [], updatedAt: 0 };
    return JSON.parse(raw) as ActivitySignals;
  } catch {
    return { recentTools: [], recentCategories: [], updatedAt: 0 };
  }
}

/** Record local tool/category interest — privacy-safe, device-only. */
export function recordTrendActivity(toolHref: string, category?: string): void {
  if (typeof window === "undefined") return;
  const prev = readActivity();
  const recentTools = [toolHref, ...prev.recentTools.filter((t) => t !== toolHref)].slice(0, 8);
  const recentCategories = category
    ? [category, ...prev.recentCategories.filter((c) => c !== category)].slice(0, 6)
    : prev.recentCategories;
  localStorage.setItem(
    ACTIVITY_KEY,
    JSON.stringify({ recentTools, recentCategories, updatedAt: Date.now() } satisfies ActivitySignals)
  );
}

export type PersonalizedRecommendation = {
  id: string;
  title: string;
  description: string;
  href: string;
  reason: string;
};

/** Client-side recommendations from local activity only — no private server data. */
export function getLocalPersonalizedRecommendations(limit = 6): PersonalizedRecommendation[] {
  const activity = readActivity();
  const saved = listSavedPrompts().slice(0, 2);
  const items: PersonalizedRecommendation[] = [];

  for (const href of activity.recentTools) {
    const match = DISCOVER_ITEMS.find((d) => d.href === href || href.startsWith(d.href));
    if (match) {
      items.push({
        id: `tool-${match.id}`,
        title: match.title,
        description: match.description,
        href: match.href,
        reason: "Based on your recent activity",
      });
    }
  }

  for (const category of activity.recentCategories) {
    const match = DISCOVER_ITEMS.find((d) => d.category === category);
    if (match && !items.some((i) => i.id === `cat-${match.id}`)) {
      items.push({
        id: `cat-${match.id}`,
        title: match.title,
        description: match.description,
        href: match.href,
        reason: `Because you explore ${category.replace("-", " ")}`,
      });
    }
  }

  for (const prompt of saved) {
    items.push({
      id: `saved-${prompt.id}`,
      title: prompt.title,
      description: "Continue with your saved prompt",
      href: "/chat",
      reason: "From your saved prompts",
    });
  }

  if (!items.length) {
    return DISCOVER_ITEMS.slice(0, limit).map((d: DiscoverItem) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      href: d.href,
      reason: "Popular on Giga3",
    }));
  }

  return items.slice(0, limit);
}
