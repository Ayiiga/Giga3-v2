const RECENT_KEY = "giga3_gigasocial_recent_searches";
const MAX_RECENT = 8;

export const TRENDING_SEARCHES = [
  "education",
  "creator",
  "ai",
  "football",
  "marketplace",
  "gigalearn",
  "startup",
  "music",
] as const;

export function readRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string").slice(0, MAX_RECENT)
      : [];
  } catch {
    return [];
  }
}

export function rememberSearch(query: string): void {
  const trimmed = query.trim();
  if (!trimmed || typeof window === "undefined") return;
  const next = [trimmed, ...readRecentSearches().filter((q) => q !== trimmed)].slice(
    0,
    MAX_RECENT
  );
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
