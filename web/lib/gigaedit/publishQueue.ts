/**
 * Offline publish queue for GigaEdit → GigaSocial media posts.
 * Separate from socialOutbox (which cannot carry media blobs).
 */

import type { GigaEditPublishHandoff } from "@/lib/gigaedit/publishTypes";

const DB_NAME = "giga3-gigaedit-publish-queue-v1";
const DB_VERSION = 1;
const STORE = "queue";

export type GigaEditPublishQueueItem = {
  id: string;
  handoff: GigaEditPublishHandoff;
  destination: "feed" | "reel" | "story";
  attempts: number;
  createdAt: number;
  lastError?: string;
};

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

function idbReq<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB error"));
  });
}

export async function enqueuePublishQueue(
  item: Omit<GigaEditPublishQueueItem, "id" | "attempts" | "createdAt"> & {
    id?: string;
  }
): Promise<GigaEditPublishQueueItem> {
  const full: GigaEditPublishQueueItem = {
    id: item.id ?? `pq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    handoff: item.handoff,
    destination: item.destination,
    attempts: 0,
    createdAt: Date.now(),
    lastError: item.lastError,
  };
  const db = await openDb();
  if (!db) return full;
  const tx = db.transaction(STORE, "readwrite");
  await idbReq(tx.objectStore(STORE).put(full));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("giga3:gigaedit-publish-queue-changed"));
  }
  return full;
}

export async function listPublishQueue(): Promise<GigaEditPublishQueueItem[]> {
  const db = await openDb();
  if (!db) return [];
  try {
    const tx = db.transaction(STORE, "readonly");
    const rows = (await idbReq(tx.objectStore(STORE).getAll())) as GigaEditPublishQueueItem[];
    return rows.sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function removePublishQueueItem(id: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction(STORE, "readwrite");
  await idbReq(tx.objectStore(STORE).delete(id));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("giga3:gigaedit-publish-queue-changed"));
  }
}

/**
 * When online, re-surface queued handoffs so the user can finish posting in composer.
 * Does not auto-upload (keeps auth/API surface unchanged).
 */
export async function flushPublishQueueToHandoff(): Promise<number> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return 0;
  const queue = await listPublishQueue();
  if (queue.length === 0) return 0;
  const first = queue[0];
  try {
    const raw = JSON.stringify({ ...first.handoff, destination: first.destination });
    sessionStorage.setItem("giga3_gigaedit_publish_handoff_v1", raw);
    try {
      localStorage.setItem("giga3_gigaedit_publish_handoff_backup_v1", raw);
    } catch {
      /* quota */
    }
  } catch {
    return 0;
  }
  await removePublishQueueItem(first.id);
  return 1;
}
