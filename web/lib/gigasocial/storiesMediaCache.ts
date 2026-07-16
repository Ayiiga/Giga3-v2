import { getPostMediaKind, getPostMediaUrls } from "@/lib/gigasocial/postMedia";
import type { SocialPost } from "@/lib/gigasocial/types";

const DB_NAME = "giga3-gigasocial-stories-cache";
const DB_VERSION = 1;
const STORE_META = "meta";
const STORE_BLOBS = "blobs";

/** Max total cached story media (~80 MB). */
export const STORIES_CACHE_MAX_BYTES = 80 * 1024 * 1024;

/** Drop cached media older than 7 days. */
export const STORIES_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const FETCH_TIMEOUT_MS = 45_000;

export type CachedStoryPlayback = {
  mediaUrl: string;
  thumbnailUrl?: string;
};

type CacheMetaRecord = {
  postId: string;
  sourceMediaUrl: string;
  sourceThumbnailUrl?: string;
  mediaBytes: number;
  thumbnailBytes: number;
  cachedAt: number;
  viewedAt: number;
  lastAccessedAt: number;
};

type BlobKind = "media" | "thumbnail";

type Listener = () => void;
const listeners = new Set<Listener>();

function blobKey(postId: string, kind: BlobKind): string {
  return `${postId}:${kind}`;
}

function notifyCacheChanged() {
  for (const listener of listeners) listener();
}

export function subscribeToStoriesMediaCache(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "postId" });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS);
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

async function readAllMeta(db: IDBDatabase): Promise<CacheMetaRecord[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, "readonly");
    const req = tx.objectStore(STORE_META).getAll();
    req.onsuccess = () => resolve((req.result as CacheMetaRecord[]) ?? []);
    req.onerror = () => reject(req.error ?? new Error("read meta failed"));
  });
}

async function readMeta(db: IDBDatabase, postId: string): Promise<CacheMetaRecord | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, "readonly");
    const req = tx.objectStore(STORE_META).get(postId);
    req.onsuccess = () => resolve((req.result as CacheMetaRecord | undefined) ?? null);
    req.onerror = () => reject(req.error ?? new Error("read meta failed"));
  });
}

async function writeMeta(db: IDBDatabase, meta: CacheMetaRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("write meta failed"));
    tx.objectStore(STORE_META).put(meta);
  });
}

async function deleteMeta(db: IDBDatabase, postId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("delete meta failed"));
    tx.objectStore(STORE_META).delete(postId);
  });
}

async function readBlob(db: IDBDatabase, key: string): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, "readonly");
    const req = tx.objectStore(STORE_BLOBS).get(key);
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
    req.onerror = () => reject(req.error ?? new Error("read blob failed"));
  });
}

async function writeBlob(db: IDBDatabase, key: string, blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("write blob failed"));
    tx.objectStore(STORE_BLOBS).put(blob, key);
  });
}

async function deleteBlob(db: IDBDatabase, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("delete blob failed"));
    tx.objectStore(STORE_BLOBS).delete(key);
  });
}

function totalBytes(meta: CacheMetaRecord): number {
  return meta.mediaBytes + meta.thumbnailBytes;
}

async function removeCachedStoryInternal(db: IDBDatabase, postId: string): Promise<void> {
  await deleteBlob(db, blobKey(postId, "media"));
  await deleteBlob(db, blobKey(postId, "thumbnail"));
  await deleteMeta(db, postId);
}

export async function removeCachedStory(postId: string): Promise<void> {
  if (!postId || typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    await removeCachedStoryInternal(db, postId);
    notifyCacheChanged();
  } catch {
    /* ignore */
  }
}

async function fetchBlob(url: string): Promise<Blob | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: "omit",
      cache: "force-cache",
    });
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

async function ensureQuota(db: IDBDatabase, incomingBytes: number): Promise<void> {
  const rows = await readAllMeta(db);
  const now = Date.now();
  let used = rows.reduce((sum, row) => sum + totalBytes(row), 0);

  const expired = rows.filter((row) => now - row.cachedAt > STORIES_CACHE_MAX_AGE_MS);
  for (const row of expired) {
    await removeCachedStoryInternal(db, row.postId);
    used -= totalBytes(row);
  }

  if (used + incomingBytes <= STORIES_CACHE_MAX_BYTES) return;

  const candidates = (await readAllMeta(db)).sort(
    (a, b) => a.lastAccessedAt - b.lastAccessedAt
  );

  for (const row of candidates) {
    if (used + incomingBytes <= STORIES_CACHE_MAX_BYTES) break;
    await removeCachedStoryInternal(db, row.postId);
    used -= totalBytes(row);
  }
}

/** Cache media for a story/reel the user has already watched. */
export async function cacheViewedStoryMedia(post: SocialPost): Promise<boolean> {
  if (typeof indexedDB === "undefined") return false;
  if (getPostMediaKind(post) !== "video") return false;

  const mediaUrl = getPostMediaUrls(post)[0];
  if (!mediaUrl) return false;

  try {
    const db = await openDb();
    const existing = await readMeta(db, post._id);
    if (existing?.sourceMediaUrl === mediaUrl) {
      await writeMeta(db, { ...existing, lastAccessedAt: Date.now() });
      return true;
    }

    const mediaBlob = await fetchBlob(mediaUrl);
    if (!mediaBlob || mediaBlob.size < 1) return false;

    const thumbnailUrl = post.videoThumbnailUrl;
    let thumbnailBlob: Blob | null = null;
    if (thumbnailUrl) {
      thumbnailBlob = await fetchBlob(thumbnailUrl);
    }

    const incomingBytes = mediaBlob.size + (thumbnailBlob?.size ?? 0);
    await ensureQuota(db, incomingBytes);

    await writeBlob(db, blobKey(post._id, "media"), mediaBlob);
    if (thumbnailBlob) {
      await writeBlob(db, blobKey(post._id, "thumbnail"), thumbnailBlob);
    } else {
      await deleteBlob(db, blobKey(post._id, "thumbnail"));
    }

    const now = Date.now();
    await writeMeta(db, {
      postId: post._id,
      sourceMediaUrl: mediaUrl,
      sourceThumbnailUrl: thumbnailUrl,
      mediaBytes: mediaBlob.size,
      thumbnailBytes: thumbnailBlob?.size ?? 0,
      cachedAt: now,
      viewedAt: now,
      lastAccessedAt: now,
    });

    notifyCacheChanged();
    return true;
  } catch {
    return false;
  }
}

export async function isStoryMediaCached(postId: string): Promise<boolean> {
  if (!postId || typeof indexedDB === "undefined") return false;
  try {
    const db = await openDb();
    const meta = await readMeta(db, postId);
    if (!meta) return false;
    const blob = await readBlob(db, blobKey(postId, "media"));
    return Boolean(blob && blob.size > 0);
  } catch {
    return false;
  }
}

export async function getCachedStoryIds(): Promise<Set<string>> {
  if (typeof indexedDB === "undefined") return new Set();
  try {
    const db = await openDb();
    const rows = await readAllMeta(db);
    return new Set(rows.map((row) => row.postId));
  } catch {
    return new Set();
  }
}

export async function getCachedStoryPlayback(
  postId: string
): Promise<CachedStoryPlayback | null> {
  if (!postId || typeof indexedDB === "undefined") return null;
  try {
    const db = await openDb();
    const meta = await readMeta(db, postId);
    if (!meta) return null;

    const mediaBlob = await readBlob(db, blobKey(postId, "media"));
    if (!mediaBlob) return null;

    const thumbBlob = await readBlob(db, blobKey(postId, "thumbnail"));
    await writeMeta(db, { ...meta, lastAccessedAt: Date.now() });

    return {
      mediaUrl: URL.createObjectURL(mediaBlob),
      thumbnailUrl: thumbBlob ? URL.createObjectURL(thumbBlob) : undefined,
    };
  } catch {
    return null;
  }
}

/** Remove cache entries no longer in the active feed snapshot or viewed list. */
export async function pruneStoriesMediaCache(args: {
  activePostIds: Set<string>;
  viewedPostIds: Set<string>;
}): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    const rows = await readAllMeta(db);
    const now = Date.now();

    for (const row of rows) {
      const expired = now - row.cachedAt > STORIES_CACHE_MAX_AGE_MS;
      const notInFeed = !args.activePostIds.has(row.postId);
      const notViewed = !args.viewedPostIds.has(row.postId);
      if (expired || (notInFeed && notViewed)) {
        await removeCachedStoryInternal(db, row.postId);
      }
    }
    notifyCacheChanged();
  } catch {
    /* ignore */
  }
}
