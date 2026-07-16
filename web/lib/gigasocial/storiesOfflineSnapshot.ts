import type { SocialPost } from "@/lib/gigasocial/types";

const SNAPSHOT_KEY = "gigasocial-reels-offline-snapshot-v1";

/** Offline snapshot validity — matches stories feed refresh window. */
export const STORIES_SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type ReelsSnapshot = {
  savedAt: number;
  reels: SocialPost[];
};

function readSnapshot(): ReelsSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReelsSnapshot;
    if (!parsed || !Array.isArray(parsed.reels) || typeof parsed.savedAt !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveReelsSnapshot(reels: SocialPost[]): void {
  if (typeof window === "undefined" || !reels.length) return;
  try {
    const payload: ReelsSnapshot = {
      savedAt: Date.now(),
      reels,
    };
    window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(payload));
  } catch {
    /* quota or private mode */
  }
}

export function loadReelsSnapshot(): SocialPost[] | null {
  const snapshot = readSnapshot();
  if (!snapshot) return null;
  if (Date.now() - snapshot.savedAt > STORIES_SNAPSHOT_MAX_AGE_MS) return null;
  return snapshot.reels;
}

export function getReelsSnapshotSavedAt(): number | null {
  return readSnapshot()?.savedAt ?? null;
}

export function clearReelsSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    /* ignore */
  }
}

/** Offline browsing: viewed reels that still have metadata in the snapshot. */
export function offlineViewedReels(
  snapshot: SocialPost[] | null,
  viewedIds: Set<string>
): SocialPost[] {
  if (!snapshot?.length) return [];
  return snapshot.filter((post) => viewedIds.has(post._id));
}
