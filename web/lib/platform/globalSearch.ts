import { siteConfig } from "@/lib/site";
import type { PlatformSearchResult } from "@/lib/automation/types";

/** Static platform routes searchable via global search. */
const STATIC_ROUTES: {
  title: string;
  snippet: string;
  href: string;
  kind: SearchResultKind | "ai_tool" | "settings" | "wallet" | "marketplace";
  keywords: string[];
}[] = [
  { title: "Chat", snippet: "AI conversations and assistants", href: "/chat", kind: "conversation", keywords: ["chat", "ai", "assistant"] },
  { title: "GigaLearn", snippet: "Learning workspace and study tools", href: "/gigalearn", kind: "learning_artifact", keywords: ["learn", "study", "education", "homework"] },
  { title: "Creator Studio", snippet: "Content and creative tools", href: "/creator-studio", kind: "creator_artifact", keywords: ["creator", "content", "write"] },
  { title: "Media Studio", snippet: "AI image generation", href: "/media", kind: "ai_tool", keywords: ["image", "media", "generate", "art"] },
  { title: "Video AI", snippet: "Text-to-video generation", href: "/video", kind: "ai_tool", keywords: ["video", "generate"] },
  { title: "Marketplace", snippet: "Browse digital products", href: "/marketplace", kind: "marketplace", keywords: ["market", "buy", "sell", "shop"] },
  { title: "Wallet", snippet: "Credits and usage history", href: "/wallet", kind: "wallet", keywords: ["wallet", "credits", "balance", "payment"] },
  { title: "GigaSocial", snippet: "Community feed and posts", href: "/gigasocial", kind: "community", keywords: ["social", "feed", "community", "posts"] },
  { title: "Automation", snippet: "Workflows and AI agents", href: "/automation", kind: "workflow", keywords: ["automation", "workflow", "agent"] },
  { title: "Enterprise", snippet: "Organizations and teams", href: "/enterprise", kind: "settings", keywords: ["enterprise", "business", "org"] },
  { title: "Workspace", snippet: "Education workspace", href: "/workspace", kind: "settings", keywords: ["workspace", "class", "school"] },
  { title: "Pricing", snippet: "Plans and subscriptions", href: "/pricing", kind: "settings", keywords: ["pricing", "plan", "subscribe"] },
  { title: "About Giga3", snippet: siteConfig.description, href: "/about", kind: "settings", keywords: ["about", "mission", "africa", "ghana"] },
  { title: "Install app", snippet: "Install Giga3 as a PWA", href: "/install", kind: "settings", keywords: ["install", "pwa", "app"] },
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

export function searchStaticRoutes(query: string): PlatformSearchResult[] {
  const q = query.trim();
  if (!q) return [];

  return STATIC_ROUTES.map((route) => {
    const score = scoreMatch(q, route.title, route.snippet, ...route.keywords);
    if (score <= 0) return null;
    return {
      id: `route:${route.href}`,
      kind: route.kind as PlatformSearchResult["kind"],
      title: route.title,
      snippet: route.snippet,
      href: route.href,
      score,
    };
  })
    .filter((r): r is PlatformSearchResult => r !== null)
    .sort((a, b) => b.score - a.score);
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
