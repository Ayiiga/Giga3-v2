/**
 * Offline GigaLearn progress events — queued locally, synced via recordAssessment on reconnect.
 */
import {
  OFFLINE_PROGRESS_STORE,
  openOfflineGigaLearnDb,
} from "@/lib/gigalearn/offlineLessons";

export type OfflineAssessmentEvent = {
  clientEventId: string;
  topicKey?: string;
  subject?: string;
  curriculum?: string;
  score: number;
  toolId?: string;
  weakness?: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
  syncedAt?: number;
};

export type OfflineProgressSyncState =
  | "idle"
  | "pending"
  | "syncing"
  | "synced"
  | "failed";

export function newOfflineProgressEventId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `gl-progress-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function withProgressDb<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T> | T
): Promise<T | null> {
  const db = await openOfflineGigaLearnDb();
  if (!db) return null;
  try {
    const tx = db.transaction(OFFLINE_PROGRESS_STORE, mode);
    const store = tx.objectStore(OFFLINE_PROGRESS_STORE);
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

export async function listOfflineProgressEvents(): Promise<OfflineAssessmentEvent[]> {
  const rows = await withProgressDb("readonly", (store) => {
    return new Promise<OfflineAssessmentEvent[]>((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const all = ((req.result as OfflineAssessmentEvent[]) ?? []).sort(
          (a, b) => a.createdAt - b.createdAt
        );
        resolve(all.filter((row) => !row.syncedAt));
      };
      req.onerror = () => resolve([]);
    });
  });
  return rows ?? [];
}

export async function queueOfflineAssessmentEvent(
  event: Omit<OfflineAssessmentEvent, "attempts" | "createdAt"> & {
    attempts?: number;
    createdAt?: number;
  }
): Promise<void> {
  const pending = await listOfflineProgressEvents();
  if (pending.some((row) => row.clientEventId === event.clientEventId)) {
    return;
  }
  const row: OfflineAssessmentEvent = {
    ...event,
    attempts: event.attempts ?? 0,
    createdAt: event.createdAt ?? Date.now(),
  };
  await withProgressDb("readwrite", (store) => {
    store.put(row);
  });
}

export async function removeOfflineProgressEvent(clientEventId: string): Promise<void> {
  await withProgressDb("readwrite", (store) => {
    store.delete(clientEventId);
  });
}

export async function bumpOfflineProgressAttempt(
  clientEventId: string,
  lastError: string
): Promise<void> {
  await withProgressDb("readwrite", (store) => {
    return new Promise<void>((resolve) => {
      const getReq = store.get(clientEventId);
      getReq.onsuccess = () => {
        const row = getReq.result as OfflineAssessmentEvent | undefined;
        if (!row || row.syncedAt) {
          resolve();
          return;
        }
        store.put({
          ...row,
          attempts: row.attempts + 1,
          lastError,
        });
        resolve();
      };
      getReq.onerror = () => resolve();
    });
  });
}

export async function offlineProgressPendingCount(): Promise<number> {
  return (await listOfflineProgressEvents()).length;
}
