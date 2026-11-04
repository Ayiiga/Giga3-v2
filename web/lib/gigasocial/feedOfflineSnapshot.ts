import type { SocialPost } from "@/lib/gigasocial/types";
import { getUserEmail } from "@/lib/auth";

const SNAPSHOT_KEY_PREFIX = "gigasocial-feed-offline-snapshot-v2";

// Feed snapshots can contain account-personalized content. Keep each account
// isolated so a shared device never displays another user's cached feed.
function snapshotKey(): string {
  const email = getUserEmail()?.trim().toLowerCase();
  return SNAPSHOT_KEY_PREFIX + ":" + (email || "guest");
}

/** Offline feed snapshot validity — 24 hours. */
export const FEED_SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type FeedSnapshot = {
  savedAt: number;
  posts: SocialPost[];
};

function readSnapshot(): FeedSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(snapshotKey());
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
    window.localStorage.setItem(snapshotKey(), JSON.stringify(payload));
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
    window.localStorage.removeItem(snapshotKey());
  } catch {
    /* ignore */
  }
}
