const STORAGE_KEY = "gigasocial-viewed-stories-v1";
const MAX_STORED_IDS = 200;

function readIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(-MAX_STORED_IDS)));
  } catch {
    // Quota or private mode — ignore.
  }
}

export function getViewedStoryIds(): Set<string> {
  return new Set(readIds());
}

export function markStoryViewed(storyId: string) {
  if (!storyId) return;
  const ids = readIds();
  if (ids.includes(storyId)) return;
  writeIds([...ids, storyId]);
}

export function markStoriesViewed(storyIds: string[]) {
  if (!storyIds.length) return;
  const set = new Set(readIds());
  let changed = false;
  for (const id of storyIds) {
    if (!id || set.has(id)) continue;
    set.add(id);
    changed = true;
  }
  if (changed) writeIds([...set]);
}

export function hasUnviewedStories(storyIds: string[]): boolean {
  if (!storyIds.length) return false;
  const viewed = getViewedStoryIds();
  return storyIds.some((id) => !viewed.has(id));
}

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeToViewedStories(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyViewedStoriesChanged() {
  for (const listener of listeners) listener();
}
