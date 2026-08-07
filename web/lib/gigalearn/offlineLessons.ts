/**
 * Cache previously viewed GigaLearn lesson/artifact payloads for offline reopen.
 * Uses IndexedDB; does not change generation APIs.
 */

const DB_NAME = "giga3-gigalearn-offline";
const STORE = "lessons";
const DB_VERSION = 1;
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
