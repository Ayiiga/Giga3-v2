import {
  bumpOfflineProgressAttempt,
  listOfflineProgressEvents,
  removeOfflineProgressEvent,
  type OfflineAssessmentEvent,
} from "@/lib/gigalearn/offlineProgressQueue";

export const MAX_OFFLINE_PROGRESS_SYNC_ATTEMPTS = 5;

export type AssessmentSyncHandler = (event: OfflineAssessmentEvent) => Promise<void>;

export type FlushOfflineProgressResult = {
  synced: number;
  failed: number;
  remaining: number;
  deadLettered: number;
};

/** Flush queued assessment events oldest-first; skips duplicates within one flush. */
export async function flushOfflineProgressQueue(
  syncHandler: AssessmentSyncHandler
): Promise<FlushOfflineProgressResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const remaining = await listOfflineProgressEvents();
    return { synced: 0, failed: 0, remaining: remaining.length, deadLettered: 0 };
  }

  const rows = await listOfflineProgressEvents();
  const applied = new Set<string>();
  let synced = 0;
  let failed = 0;
  let deadLettered = 0;

  for (const row of rows) {
    if (applied.has(row.clientEventId)) continue;
    if (row.attempts >= MAX_OFFLINE_PROGRESS_SYNC_ATTEMPTS) {
      await removeOfflineProgressEvent(row.clientEventId);
      failed += 1;
      deadLettered += 1;
      continue;
    }
    applied.add(row.clientEventId);
    try {
      await syncHandler(row);
      await removeOfflineProgressEvent(row.clientEventId);
      synced += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sync failed";
      await bumpOfflineProgressAttempt(row.clientEventId, msg);
      failed += 1;
    }
  }

  const remaining = await listOfflineProgressEvents();
  return { synced, failed, remaining: remaining.length, deadLettered };
}
