/**
 * Explicit offline downloads for Discover media packs.
 * Stores catalog snapshots in IndexedDB — does not auto-cache the full library.
 * Remote binary assets are opt-in and skipped when unavailable (quota / network).
 */

import {
  OFFLINE_MEDIA_STORE,
  openOfflineGigaLearnDb,
} from "@/lib/gigalearn/offlineLessons";
import type { LearningMediaItem, OfflineMediaPack } from "@/lib/gigalearn/mediaLibrary/types";

const MAX_MEDIA_PACKS = 30;

/** In-flight downloads — prevents duplicate concurrent fetches for the same item. */
const inflight = new Map<string, Promise<OfflineMediaPack>>();

function packIdForItem(itemId: string): string {
  return `media:${itemId}`;
}

async function withMediaDb<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T> | T
): Promise<T | null> {
  const db = await openOfflineGigaLearnDb();
  if (!db) return null;
  try {
    const tx = db.transaction(OFFLINE_MEDIA_STORE, mode);
    const store = tx.objectStore(OFFLINE_MEDIA_STORE);
    const result = await run(store);
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
    return result;
  } finally {
    db.close();
  }
}

async function putPack(pack: OfflineMediaPack): Promise<void> {
  await withMediaDb("readwrite", (store) => {
    store.put(pack);
  });
  const db = await openOfflineGigaLearnDb();
  if (!db) return;
  try {
    await pruneMediaPacks(db);
  } finally {
    db.close();
  }
}

export async function listOfflineMediaPacks(): Promise<OfflineMediaPack[]> {
  const rows = await withMediaDb("readonly", (store) => {
    return new Promise<OfflineMediaPack[]>((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as OfflineMediaPack[]) ?? []);
      req.onerror = () => resolve([]);
    });
  });
  return (rows ?? []).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getOfflineMediaPack(itemId: string): Promise<OfflineMediaPack | null> {
  const row = await withMediaDb("readonly", (store) => {
    return new Promise<OfflineMediaPack | null>((resolve) => {
      const req = store.get(packIdForItem(itemId));
      req.onsuccess = () => resolve((req.result as OfflineMediaPack) ?? null);
      req.onerror = () => resolve(null);
    });
  });
  return row ?? null;
}

export async function removeOfflineMediaPack(itemId: string): Promise<void> {
  await withMediaDb("readwrite", (store) => {
    store.delete(packIdForItem(itemId));
  });
  inflight.delete(itemId);
}

export function estimateMediaPackBytes(item: LearningMediaItem): number {
  const remote = (item.remoteMedia ?? []).reduce((sum, asset) => sum + asset.estimatedBytes, 0);
  return item.estimatedOfflineBytes + remote;
}

export async function getOfflineMediaStorageSummary(): Promise<{
  packCount: number;
  bytesStored: number;
  readyCount: number;
}> {
  const packs = await listOfflineMediaPacks();
  return {
    packCount: packs.length,
    bytesStored: packs.reduce((sum, pack) => sum + (pack.bytesStored || 0), 0),
    readyCount: packs.filter((pack) => pack.status === "ready").length,
  };
}

/**
 * Download (or re-download) a media item for offline use.
 * JSON snapshot always; remote blobs only when online and within quota.
 */
export async function downloadMediaPack(
  item: LearningMediaItem,
  options?: { onProgress?: (pack: OfflineMediaPack) => void }
): Promise<OfflineMediaPack> {
  if (!item.offlineEligible) {
    throw new Error("This item is not available for offline download.");
  }
  const existing = inflight.get(item.id);
  if (existing) return existing;

  const job = (async () => {
    const now = Date.now();
    const prior = await getOfflineMediaPack(item.id);
    if (prior?.status === "ready" && prior.item.id === item.id) {
      return prior;
    }

    let pack: OfflineMediaPack = {
      id: packIdForItem(item.id),
      itemId: item.id,
      title: item.title,
      item: structuredClone(item),
      blobs: {},
      status: "downloading",
      progress: 0.15,
      bytesTotal: estimateMediaPackBytes(item),
      bytesStored: 0,
      savedAt: prior?.savedAt ?? now,
      updatedAt: now,
    };
    await putPack(pack);
    options?.onProgress?.(pack);

    const blobs: NonNullable<OfflineMediaPack["blobs"]> = {};
    const remote = item.remoteMedia ?? [];
    let stored = Math.min(item.estimatedOfflineBytes, pack.bytesTotal);

    for (let i = 0; i < remote.length; i++) {
      const asset = remote[i]!;
      try {
        if (typeof fetch === "undefined") {
          throw new Error("Network unavailable");
        }
        const res = await fetch(asset.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = await res.arrayBuffer();
        // Keep small assets as data URLs for offline <audio>/<img>; skip huge payloads.
        if (buffer.byteLength > 1_500_000) {
          throw new Error("Asset too large for inline offline cache");
        }
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let b = 0; b < bytes.length; b++) binary += String.fromCharCode(bytes[b]!);
        const dataUrl = `data:${asset.mimeType};base64,${btoa(binary)}`;
        blobs[asset.url] = {
          mimeType: asset.mimeType,
          byteLength: buffer.byteLength,
          dataUrl,
        };
        stored += buffer.byteLength;
      } catch (err) {
        // JSON lesson/game remains usable offline without remote media.
        pack = {
          ...pack,
          errorMessage:
            err instanceof Error
              ? `Optional media skipped: ${err.message}`
              : "Optional media skipped",
        };
      }
      pack = {
        ...pack,
        blobs,
        bytesStored: stored,
        progress: 0.2 + ((i + 1) / Math.max(remote.length, 1)) * 0.7,
        updatedAt: Date.now(),
        status: "downloading",
      };
      await putPack(pack);
      options?.onProgress?.(pack);
    }

    pack = {
      ...pack,
      blobs,
      bytesStored: stored,
      progress: 1,
      status: "ready",
      updatedAt: Date.now(),
    };
    await putPack(pack);
    options?.onProgress?.(pack);
    return pack;
  })();

  inflight.set(item.id, job);
  try {
    return await job;
  } catch (err) {
    const failed: OfflineMediaPack = {
      id: packIdForItem(item.id),
      itemId: item.id,
      title: item.title,
      item: structuredClone(item),
      status: "error",
      progress: 0,
      bytesTotal: estimateMediaPackBytes(item),
      bytesStored: 0,
      errorMessage: err instanceof Error ? err.message : "Download failed",
      savedAt: Date.now(),
      updatedAt: Date.now(),
    };
    await putPack(failed);
    options?.onProgress?.(failed);
    throw err;
  } finally {
    inflight.delete(item.id);
  }
}

async function pruneMediaPacks(db: IDBDatabase): Promise<void> {
  const rows = await new Promise<OfflineMediaPack[]>((resolve) => {
    const tx = db.transaction(OFFLINE_MEDIA_STORE, "readonly");
    const req = tx.objectStore(OFFLINE_MEDIA_STORE).getAll();
    req.onsuccess = () => resolve(req.result as OfflineMediaPack[]);
    req.onerror = () => resolve([]);
  });
  if (rows.length <= MAX_MEDIA_PACKS) return;
  const sorted = [...rows].sort((a, b) => b.updatedAt - a.updatedAt);
  const drop = sorted.slice(MAX_MEDIA_PACKS);
  await new Promise<void>((resolve) => {
    const tx = db.transaction(OFFLINE_MEDIA_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    const store = tx.objectStore(OFFLINE_MEDIA_STORE);
    for (const row of drop) store.delete(row.id);
  });
}
