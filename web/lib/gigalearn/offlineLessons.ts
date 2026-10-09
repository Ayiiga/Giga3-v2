/**
 * Cache previously viewed GigaLearn lesson/artifact payloads for offline reopen.
 * Uses IndexedDB; does not change generation APIs.
 */

const DB_NAME = "giga3-gigalearn-offline";
export const OFFLINE_LESSONS_STORE = "lessons";
export const OFFLINE_PROGRESS_STORE = "progress_queue";
/** Explicit multimedia Discover downloads (JSON snapshots + optional blobs). */
export const OFFLINE_MEDIA_STORE = "media_packs";
const STORE = OFFLINE_LESSONS_STORE;
const DB_VERSION = 3;
const MAX_LESSONS = 40;

export type OfflineLessonPack = {
  id: string;
  title: string;
  content: string;
  toolId?: string;
  curriculum?: string;
  subject?: string;
  savedAt: number;
};

/** Shared IndexedDB for offline lessons + progress sync queue. */
export function openOfflineGigaLearnDb(): Promise<IDBDatabase | null> {
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
      if (!db.objectStoreNames.contains(OFFLINE_PROGRESS_STORE)) {
        db.createObjectStore(OFFLINE_PROGRESS_STORE, { keyPath: "clientEventId" });
      }
      if (!db.objectStoreNames.contains(OFFLINE_MEDIA_STORE)) {
        db.createObjectStore(OFFLINE_MEDIA_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

function openDb(): Promise<IDBDatabase | null> {
  return openOfflineGigaLearnDb();
}

export async function saveOfflineLesson(
  pack: Omit<OfflineLessonPack, "savedAt"> & { savedAt?: number }
): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const row: OfflineLessonPack = {
    ...pack,
    savedAt: pack.savedAt ?? Date.now(),
  };
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.objectStore(STORE).put(row);
  });
  await pruneOfflineLessons(db);
}

export async function listOfflineLessons(): Promise<OfflineLessonPack[]> {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const rows = (req.result as OfflineLessonPack[]).sort(
        (a, b) => b.savedAt - a.savedAt
      );
      resolve(rows);
    };
    req.onerror = () => resolve([]);
  });
}

export async function getOfflineLesson(id: string): Promise<OfflineLessonPack | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as OfflineLessonPack) ?? null);
    req.onerror = () => resolve(null);
  });
}

export async function removeOfflineLesson(id: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.objectStore(STORE).delete(id);
  });
}

export function formatOfflineStorageHint(count: number): string {
  if (count === 0) return "No lessons saved offline";
  return `${count} lesson${count === 1 ? "" : "s"} saved on this device`;
}

async function pruneOfflineLessons(db: IDBDatabase): Promise<void> {
  const rows = await new Promise<OfflineLessonPack[]>((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as OfflineLessonPack[]);
    req.onerror = () => resolve([]);
  });
  if (rows.length <= MAX_LESSONS) return;
  const sorted = [...rows].sort((a, b) => b.savedAt - a.savedAt);
  const drop = sorted.slice(MAX_LESSONS);
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    const store = tx.objectStore(STORE);
    for (const row of drop) store.delete(row.id);
  });
}
