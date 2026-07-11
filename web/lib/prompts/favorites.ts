const FAVORITES_KEY = "giga3_prompt_favorites";

export function listFavoritePromptIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function isPromptFavorite(id: string): boolean {
  return listFavoritePromptIds().includes(id);
}

export function togglePromptFavorite(id: string): boolean {
  const current = listFavoritePromptIds();
  const next = current.includes(id)
    ? current.filter((item) => item !== id)
    : [id, ...current];
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(next.slice(0, 100)));
  return next.includes(id);
}
