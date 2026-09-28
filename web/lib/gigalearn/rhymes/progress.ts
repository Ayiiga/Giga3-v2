const PROGRESS_KEY = "giga3_gigarhymes_progress";

export function readPractisedRhymes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function markRhymePractised(id: string): string[] {
  const next = [...new Set([...readPractisedRhymes(), id])];
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
  return next;
}
