import {
  bumpOfflineProgressAttempt,
  listOfflineProgressEvents,
  removeOfflineProgressEvent,
  type OfflineAssessmentEvent,
} from "@/lib/gigalearn/offlineProgressQueue";

const MAX_SYNC_ATTEMPTS = 5;

export type AssessmentSyncHandler = (event: OfflineAssessmentEvent) => Promise<void>;

/** Flush queued assessment events oldest-first; skips duplicates within one flush. */
export async function flushOfflineProgressQueue(
  syncHandler: AssessmentSyncHandler
): Promise<{ synced: number; failed: number; remaining: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const remaining = await listOfflineProgressEvents();
    return { synced: 0, failed: 0, remaining: remaining.length };
  }

  const rows = await listOfflineProgressEvents();
  const applied = new Set<string>();
  let synced = 0;
  let failed = 0;

  for (const row of rows) {
    if (applied.has(row.clientEventId)) continue;
    if (row.attempts >= MAX_SYNC_ATTEMPTS) {
      failed += 1;
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
  return { synced, failed, remaining: remaining.length };
}
