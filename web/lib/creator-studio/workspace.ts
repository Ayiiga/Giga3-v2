export type CreatorCreationKind = "writing" | "social" | "image";

export interface CreatorCreation {
  id: string;
  kind: CreatorCreationKind;
  toolId: string;
  title: string;
  prompt: string;
  content: string;
  outputUrl?: string;
  platform?: string;
  favorite: boolean;
  createdAt: number;
}

export interface CreatorPromptHistoryEntry {
  id: string;
  toolId: string;
  prompt: string;
  platform?: string;
  createdAt: number;
}

export interface CreatorUsageSnapshot {
  totalGenerations: number;
  writingGenerations: number;
  socialGenerations: number;
  imageGenerations: number;
  creditsConsumedEstimate: number;
  dailyCounts: Record<string, number>;
  lastGenerationAt: number | null;
  /** Premium feature flags — ready for future monetization. */
  premiumReady: boolean;
  dailyLimit: number;
}

const CREATIONS_KEY = "giga3_creator_creations";
const PROMPTS_KEY = "giga3_creator_prompt_history";
const USAGE_KEY = "giga3_creator_usage";
const DAILY_LIMIT = 50;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function listCreations(): CreatorCreation[] {
  return readJson<CreatorCreation[]>(CREATIONS_KEY, []).sort(
    (a, b) => b.createdAt - a.createdAt
  );
}

export function saveCreation(
  entry: Omit<CreatorCreation, "id" | "createdAt" | "favorite"> & {
    favorite?: boolean;
  }
): CreatorCreation {
  const creation: CreatorCreation = {
    ...entry,
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    favorite: entry.favorite ?? false,
    createdAt: Date.now(),
  };
  const next = [creation, ...listCreations()].slice(0, 120);
  writeJson(CREATIONS_KEY, next);
  return creation;
}

export function toggleCreationFavorite(id: string): void {
  const next = listCreations().map((c) =>
    c.id === id ? { ...c, favorite: !c.favorite } : c
  );
  writeJson(CREATIONS_KEY, next);
}

export function removeCreation(id: string): void {
  writeJson(
    CREATIONS_KEY,
    listCreations().filter((c) => c.id !== id)
  );
}

export function listPromptHistory(): CreatorPromptHistoryEntry[] {
  return readJson<CreatorPromptHistoryEntry[]>(PROMPTS_KEY, []).sort(
    (a, b) => b.createdAt - a.createdAt
  );
}

export function recordPromptHistory(entry: {
  toolId: string;
  prompt: string;
  platform?: string;
}): void {
  const row: CreatorPromptHistoryEntry = {
    id: `p_${Date.now()}`,
    toolId: entry.toolId,
    prompt: entry.prompt.trim().slice(0, 2000),
    platform: entry.platform,
    createdAt: Date.now(),
  };
  const next = [row, ...listPromptHistory().filter((p) => p.prompt !== row.prompt)].slice(
    0,
    40
  );
  writeJson(PROMPTS_KEY, next);
}

export function getUsageSnapshot(): CreatorUsageSnapshot {
  const fallback: CreatorUsageSnapshot = {
    totalGenerations: 0,
    writingGenerations: 0,
    socialGenerations: 0,
    imageGenerations: 0,
    creditsConsumedEstimate: 0,
    dailyCounts: {},
    lastGenerationAt: null,
    premiumReady: true,
    dailyLimit: DAILY_LIMIT,
  };
  return { ...fallback, ...readJson<Partial<CreatorUsageSnapshot>>(USAGE_KEY, fallback) };
}

export function canGenerateToday(): boolean {
  const usage = getUsageSnapshot();
  const today = todayKey();
  const count = usage.dailyCounts[today] ?? 0;
  return count < usage.dailyLimit;
}

export function recordCreatorUsage(
  kind: CreatorCreationKind,
  creditsUsed = 2
): CreatorUsageSnapshot {
  const usage = getUsageSnapshot();
  const today = todayKey();
  const dailyCounts = { ...usage.dailyCounts };
  dailyCounts[today] = (dailyCounts[today] ?? 0) + 1;

  const next: CreatorUsageSnapshot = {
    ...usage,
    totalGenerations: usage.totalGenerations + 1,
    writingGenerations:
      usage.writingGenerations + (kind === "writing" ? 1 : 0),
    socialGenerations: usage.socialGenerations + (kind === "social" ? 1 : 0),
    imageGenerations: usage.imageGenerations + (kind === "image" ? 1 : 0),
    creditsConsumedEstimate: usage.creditsConsumedEstimate + creditsUsed,
    dailyCounts,
    lastGenerationAt: Date.now(),
    premiumReady: true,
    dailyLimit: DAILY_LIMIT,
  };
  writeJson(USAGE_KEY, next);
  return next;
}
