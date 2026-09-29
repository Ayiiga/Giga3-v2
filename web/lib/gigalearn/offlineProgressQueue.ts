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

export async function listOfflineProgressEvents(): Promise<OfflineAssessmentEvent[]> {
  const db = await openOfflineGigaLearnDb();
  if (!db) return [];
  return new Promise((resolve) => {
    const tx = db.transaction(OFFLINE_PROGRESS_STORE, "readonly");
    const req = tx.objectStore(OFFLINE_PROGRESS_STORE).getAll();
    req.onsuccess = () => {
      const rows = (req.result as OfflineAssessmentEvent[]).sort(
        (a, b) => a.createdAt - b.createdAt
      );
      resolve(rows.filter((row) => !row.syncedAt));
    };
    req.onerror = () => resolve([]);
  });
}

export async function queueOfflineAssessmentEvent(
  event: Omit<OfflineAssessmentEvent, "attempts" | "createdAt"> & {
    attempts?: number;
    createdAt?: number;
  }
): Promise<void> {
  const db = await openOfflineGigaLearnDb();
  if (!db) return;
  const pending = await listOfflineProgressEvents();
  if (pending.some((row) => row.clientEventId === event.clientEventId)) {
    return;
  }
  const row: OfflineAssessmentEvent = {
    ...event,
    attempts: event.attempts ?? 0,
    createdAt: event.createdAt ?? Date.now(),
  };
  await new Promise<void>((resolve) => {
    const tx = db.transaction(OFFLINE_PROGRESS_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.objectStore(OFFLINE_PROGRESS_STORE).put(row);
  });
}

export async function removeOfflineProgressEvent(clientEventId: string): Promise<void> {
  const db = await openOfflineGigaLearnDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(OFFLINE_PROGRESS_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.objectStore(OFFLINE_PROGRESS_STORE).delete(clientEventId);
  });
}

export async function bumpOfflineProgressAttempt(
  clientEventId: string,
  lastError: string
): Promise<void> {
  const rows = await listOfflineProgressEvents();
  const row = rows.find((r) => r.clientEventId === clientEventId);
  if (!row) return;
  await queueOfflineAssessmentEvent({
    ...row,
    attempts: row.attempts + 1,
    lastError,
  });
}

export async function offlineProgressPendingCount(): Promise<number> {
  return (await listOfflineProgressEvents()).length;
}
