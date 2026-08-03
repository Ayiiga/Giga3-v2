/**
 * Offline manager helpers for GigaEdit.
 * Sync is a local queue stub — no backend schema changes.
 * Background flush runs when the browser comes online.
 */

const SYNC_QUEUE_KEY = "giga3_gigaedit_sync_queue_v1";

export type GigaEditSyncItem = {
  id: string;
  projectId: string;
  action: "backup" | "template-update" | "ai-asset";
  createdAt: number;
  attempts: number;
};

export function isGigaEditOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

let backgroundSyncStarted = false;

/**
 * Listen for online events and flush the local sync queue.
 * Safe to call multiple times — installs a single listener.
 */
export function startGigaEditBackgroundSync(
  onFlushed?: (count: number) => void
): () => void {
  if (typeof window === "undefined") return () => undefined;

  const flush = () => {
    void flushGigaEditSyncQueue().then((result) => {
      if (result.flushed > 0) onFlushed?.(result.flushed);
    });
  };

  if (!backgroundSyncStarted) {
    backgroundSyncStarted = true;
    window.addEventListener("online", flush);
  }

  if (isGigaEditOnline()) flush();

  return () => {
    window.removeEventListener("online", flush);
    backgroundSyncStarted = false;
  };
}

function readQueue(): GigaEditSyncItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GigaEditSyncItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items: GigaEditSyncItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(items.slice(0, 100)));
    window.dispatchEvent(new CustomEvent("giga3:gigaedit-sync-changed"));
  } catch {
    /* quota */
  }
}

export function enqueueGigaEditSync(
  item: Omit<GigaEditSyncItem, "id" | "createdAt" | "attempts">
): void {
  const next: GigaEditSyncItem = {
    ...item,
    id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
    attempts: 0,
  };
  writeQueue([next, ...readQueue()]);
}

export function listGigaEditSyncQueue(): GigaEditSyncItem[] {
  return readQueue();
}

/**
 * When online, drain queue locally. Cloud backup hooks can be added later
 * without changing this API surface.
 */
export async function flushGigaEditSyncQueue(): Promise<{ flushed: number }> {
  if (!isGigaEditOnline()) return { flushed: 0 };
  const queue = readQueue();
  if (queue.length === 0) return { flushed: 0 };
  // Frontend-only: acknowledge local backup intent and clear.
  writeQueue([]);
  return { flushed: queue.length };
}

export const GIGAEDIT_OFFLINE_CAPABILITIES = [
  "Open saved projects",
  "Edit videos",
  "Edit photos",
  "Use downloaded templates",
  "Use teleprompter",
  "Record videos",
  "Record audio",
  "Export completed projects",
  "Save drafts locally",
  "Use downloaded sounds",
  "Queue posts for upload",
  "Pro camera-style preview (local)",
  "Background sync when back online",
] as const;
