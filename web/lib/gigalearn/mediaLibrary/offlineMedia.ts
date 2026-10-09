/**
 * Explicit offline downloads for Discover media packs.
 * Stores catalog snapshots in IndexedDB — does not auto-cache the full library.
 * Required remote assets must be present locally before a pack is `ready`.
 * Optional remote assets are skipped when unavailable (quota / network).
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

export function requiredRemoteAssets(item: LearningMediaItem) {
  return (item.remoteMedia ?? []).filter((asset) => asset.required === true);
}

export function optionalRemoteAssets(item: LearningMediaItem) {
  return (item.remoteMedia ?? []).filter((asset) => asset.required !== true);
}

/** True when every required remote asset has a usable local blob. */
export function isOfflinePackComplete(pack: OfflineMediaPack): boolean {
  if (pack.status !== "ready") return false;
  const required = requiredRemoteAssets(pack.item);
  if (required.length === 0) return true;
  const blobs = pack.blobs ?? {};
  return required.every((asset) => {
    const blob = blobs[asset.url];
    return Boolean(blob?.dataUrl && blob.byteLength > 0);
  });
}

/** Advertised offline items must pass this before appearing as ready to learners. */
export function assertReadyOfflinePack(pack: OfflineMediaPack): string[] {
  const errors: string[] = [];
  if (pack.status !== "ready") {
    errors.push(`${pack.itemId}: status is ${pack.status}, not ready`);
    return errors;
  }
  if (!pack.item?.id || pack.item.id !== pack.itemId) {
    errors.push(`${pack.itemId}: catalog snapshot missing or mismatched`);
  }
  for (const asset of requiredRemoteAssets(pack.item)) {
    const blob = pack.blobs?.[asset.url];
    if (!blob?.dataUrl || blob.byteLength <= 0) {
      errors.push(`${pack.itemId}: missing required asset ${asset.url}`);
    }
  }
  return errors;
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

/** Ready packs that still have every required asset on device. */
export async function listCompleteOfflineMediaPacks(): Promise<OfflineMediaPack[]> {
  const packs = await listOfflineMediaPacks();
  return packs.filter((pack) => isOfflinePackComplete(pack));
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
    readyCount: packs.filter((pack) => isOfflinePackComplete(pack)).length,
  };
}

type DownloadOptions = {
  onProgress?: (pack: OfflineMediaPack) => void;
  /** Abort mid-download; pack is left as `error` (not ready). */
  signal?: AbortSignal;
};

/**
 * Download (or re-download) a media item for offline use.
 * JSON snapshot always; required remotes must succeed; optional remotes best-effort.
 */
export async function downloadMediaPack(
  item: LearningMediaItem,
  options?: DownloadOptions
): Promise<OfflineMediaPack> {
  if (!item.offlineEligible) {
    throw new Error("This item is not available for offline download.");
  }
  const existing = inflight.get(item.id);
  if (existing) return existing;

  const job = (async () => {
    const now = Date.now();
    const prior = await getOfflineMediaPack(item.id);
    if (prior && isOfflinePackComplete(prior) && prior.item.id === item.id) {
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

    const blobs: NonNullable<OfflineMediaPack["blobs"]> = { ...(prior?.blobs ?? {}) };
    const remote = item.remoteMedia ?? [];
    let stored = Math.min(item.estimatedOfflineBytes, pack.bytesTotal);
    const skippedOptional: string[] = [];
    const failedRequired: string[] = [];

    for (let i = 0; i < remote.length; i++) {
      if (options?.signal?.aborted) {
        const aborted: OfflineMediaPack = {
          ...pack,
          blobs,
          bytesStored: stored,
          status: "error",
          progress: pack.progress,
          errorMessage: "Download interrupted",
          updatedAt: Date.now(),
        };
        await putPack(aborted);
        options?.onProgress?.(aborted);
        throw new Error("Download interrupted");
      }

      const asset = remote[i]!;
      if (blobs[asset.url]?.dataUrl && blobs[asset.url]!.byteLength > 0) {
        stored += blobs[asset.url]!.byteLength;
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
        continue;
      }

      try {
        if (typeof fetch === "undefined") {
          throw new Error("Network unavailable");
        }
        const res = await fetch(asset.url, { signal: options?.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = await res.arrayBuffer();
        // Keep small assets as data URLs for offline <audio>/<img>/<video>.
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
        if (options?.signal?.aborted || (err instanceof Error && err.name === "AbortError")) {
          const aborted: OfflineMediaPack = {
            ...pack,
            blobs,
            bytesStored: stored,
            status: "error",
            progress: pack.progress,
            errorMessage: "Download interrupted",
            updatedAt: Date.now(),
          };
          await putPack(aborted);
          options?.onProgress?.(aborted);
          throw new Error("Download interrupted");
        }
        const message = err instanceof Error ? err.message : "fetch failed";
        if (asset.required) {
          failedRequired.push(`${asset.url} (${message})`);
        } else {
          skippedOptional.push(message);
        }
      }
      pack = {
        ...pack,
        blobs,
        bytesStored: stored,
        progress: 0.2 + ((i + 1) / Math.max(remote.length, 1)) * 0.7,
        updatedAt: Date.now(),
        status: "downloading",
        errorMessage:
          skippedOptional.length > 0
            ? `Optional media skipped: ${skippedOptional[0]}`
            : pack.errorMessage,
      };
      await putPack(pack);
      options?.onProgress?.(pack);
    }

    if (failedRequired.length > 0) {
      const failed: OfflineMediaPack = {
        ...pack,
        blobs,
        bytesStored: stored,
        status: "error",
        progress: pack.progress,
        errorMessage: `Required media missing: ${failedRequired.join("; ")}`,
        updatedAt: Date.now(),
      };
      await putPack(failed);
      options?.onProgress?.(failed);
      throw new Error(failed.errorMessage);
    }

    pack = {
      ...pack,
      blobs,
      bytesStored: stored,
      progress: 1,
      status: "ready",
      updatedAt: Date.now(),
      errorMessage:
        skippedOptional.length > 0
          ? `Optional media skipped: ${skippedOptional[0]}`
          : undefined,
    };
    if (!isOfflinePackComplete(pack)) {
      pack = {
        ...pack,
        status: "error",
        errorMessage: "Required media incomplete after download",
        progress: 0.9,
      };
      await putPack(pack);
      options?.onProgress?.(pack);
      throw new Error(pack.errorMessage);
    }
    await putPack(pack);
    options?.onProgress?.(pack);
    return pack;
  })();

  inflight.set(item.id, job);
  try {
    return await job;
  } catch (err) {
    const current = await getOfflineMediaPack(item.id);
    if (current?.status === "error") {
      options?.onProgress?.(current);
      throw err;
    }
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
