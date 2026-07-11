import { siteConfig } from "@/lib/site";
import { POPULAR_SEARCHES } from "@/lib/trends/discoverCatalog";
import { TREND_CATEGORIES } from "@/lib/trends/categories";
import type { PlatformSearchResult } from "@/lib/automation/types";

export type SearchCategoryFilter =
  | "all"
  | "pages"
  | "prompts"
  | "tools"
  | "community"
  | "learning";

export const SEARCH_CATEGORY_FILTERS: { id: SearchCategoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pages", label: "Pages" },
  { id: "prompts", label: "Prompts" },
  { id: "tools", label: "AI tools" },
  { id: "learning", label: "Learning" },
  { id: "community", label: "Community" },
];

/** Static platform routes searchable via global search. */
const STATIC_ROUTES: {
  title: string;
  snippet: string;
  href: string;
  kind: PlatformSearchResult["kind"];
  keywords: string[];
  category: SearchCategoryFilter;
}[] = [
  { title: "Chat", snippet: "AI conversations and assistants", href: "/chat", kind: "conversation", keywords: ["chat", "ai", "assistant"], category: "tools" },
  { title: "Trending hub", snippet: "Popular AI, education, and creator topics", href: "/trending", kind: "ai_tool", keywords: ["trending", "popular", "topics"], category: "pages" },
  { title: "Discover", snippet: "Explore prompts, tools, and communities", href: "/discover", kind: "ai_tool", keywords: ["discover", "explore", "find"], category: "pages" },
  { title: "Prompt library", snippet: "Curated prompts by category", href: "/prompts", kind: "chat_prompt", keywords: ["prompt", "template", "library"], category: "prompts" },
  { title: "GigaLearn", snippet: "Learning workspace and study tools", href: "/gigalearn", kind: "learning_artifact", keywords: ["learn", "study", "education", "homework"], category: "learning" },
  { title: "Creator Studio", snippet: "Content and creative tools", href: "/creator-studio", kind: "creator_artifact", keywords: ["creator", "content", "write"], category: "tools" },
  { title: "Media Studio", snippet: "AI image generation", href: "/media", kind: "ai_tool", keywords: ["image", "media", "generate", "art"], category: "tools" },
  { title: "Video AI", snippet: "Text-to-video generation", href: "/video", kind: "ai_tool", keywords: ["video", "generate"], category: "tools" },
  { title: "Marketplace", snippet: "Browse digital products", href: "/marketplace", kind: "marketplace", keywords: ["market", "buy", "sell", "shop"], category: "pages" },
  { title: "Wallet", snippet: "Credits and usage history", href: "/wallet", kind: "wallet", keywords: ["wallet", "credits", "balance", "payment"], category: "pages" },
  { title: "GigaSocial", snippet: "Community feed and posts", href: "/gigasocial", kind: "community", keywords: ["social", "feed", "community", "posts"], category: "community" },
  { title: "Automation", snippet: "Workflows and AI agents", href: "/automation", kind: "workflow", keywords: ["automation", "workflow", "agent"], category: "tools" },
  { title: "Enterprise", snippet: "Organizations and teams", href: "/enterprise", kind: "settings", keywords: ["enterprise", "business", "org"], category: "pages" },
  { title: "Workspace", snippet: "Education workspace", href: "/workspace", kind: "settings", keywords: ["workspace", "class", "school"], category: "learning" },
  { title: "Pricing", snippet: "Plans and subscriptions", href: "/pricing", kind: "settings", keywords: ["pricing", "plan", "subscribe"], category: "pages" },
  { title: "About Giga3", snippet: siteConfig.description, href: "/about", kind: "settings", keywords: ["about", "mission", "africa", "ghana"], category: "pages" },
  { title: "Install app", snippet: "Install Giga3 as a PWA", href: "/install", kind: "settings", keywords: ["install", "pwa", "app"], category: "pages" },
];

const RECENT_SEARCHES_KEY = "giga3_recent_searches";
const MAX_RECENT = 8;

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function scoreMatch(query: string, ...fields: string[]): number {
  const q = normalize(query);
  if (!q) return 0;
  let score = 0;
  for (const field of fields) {
    const f = normalize(field);
    if (!f) continue;
    if (f === q) score += 100;
    else if (f.startsWith(q)) score += 60;
    else if (f.includes(q)) score += 30;
  }
  return score;
}

export function searchStaticRoutes(
  query: string,
  category: SearchCategoryFilter = "all"
): PlatformSearchResult[] {
  const q = query.trim();
  if (!q) return [];

  return STATIC_ROUTES.map((route) => {
    if (category !== "all" && route.category !== category) return null;
    const score = scoreMatch(q, route.title, route.snippet, ...route.keywords);
    if (score <= 0) return null;
    return {
      id: `route:${route.href}`,
      kind: route.kind,
      title: route.title,
      snippet: route.snippet,
      href: route.href,
      score,
    };
  })
    .filter((r): r is PlatformSearchResult => r !== null)
    .sort((a, b) => b.score - a.score);
}

export function getPopularSearches(): readonly string[] {
  return POPULAR_SEARCHES;
}

export function getSearchSuggestions(query: string, limit = 6): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...POPULAR_SEARCHES].slice(0, limit);

  const fromPopular = POPULAR_SEARCHES.filter((item) => item.toLowerCase().includes(q));
  const fromCategories = TREND_CATEGORIES.filter(
    (cat) =>
      cat.label.toLowerCase().includes(q) ||
      cat.keywords.some((keyword) => keyword.includes(q))
  ).map((cat) => cat.label);
  const fromRoutes = STATIC_ROUTES.filter(
    (route) =>
      route.title.toLowerCase().includes(q) ||
      route.keywords.some((keyword) => keyword.includes(q))
  ).map((route) => route.title);

  return [...new Set([...fromPopular, ...fromCategories, ...fromRoutes])].slice(0, limit);
}

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): void {
  if (typeof window === "undefined" || !query.trim()) return;
  const q = query.trim();
  const prev = getRecentSearches().filter((s) => s !== q);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([q, ...prev].slice(0, MAX_RECENT)));
}

export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}
