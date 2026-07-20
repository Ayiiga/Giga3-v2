import type { SocialPost } from "@/lib/gigasocial/types";

const SNAPSHOT_KEY = "gigasocial-feed-offline-snapshot-v1";

/** Offline feed snapshot validity — 24 hours. */
export const FEED_SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type FeedSnapshot = {
  savedAt: number;
  posts: SocialPost[];
};

function readSnapshot(): FeedSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FeedSnapshot;
    if (!parsed || !Array.isArray(parsed.posts) || typeof parsed.savedAt !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveFeedSnapshot(posts: SocialPost[]): void {
  if (typeof window === "undefined" || !posts.length) return;
  try {
    const payload: FeedSnapshot = {
      savedAt: Date.now(),
      posts: posts.slice(0, 40),
    };
    window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(payload));
  } catch {
    /* quota or private mode */
  }
}

export function loadFeedSnapshot(): SocialPost[] | null {
  const snapshot = readSnapshot();
  if (!snapshot) return null;
  if (Date.now() - snapshot.savedAt > FEED_SNAPSHOT_MAX_AGE_MS) return null;
  return snapshot.posts;
}

export function getFeedSnapshotSavedAt(): number | null {
  return readSnapshot()?.savedAt ?? null;
}

export function clearFeedSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    /* ignore */
  }
}
