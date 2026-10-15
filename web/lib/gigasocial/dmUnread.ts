/**
 * Client-only DM unread helpers.
 * Phase 2C has socialDmReads schema but no mark-read / unread-count APIs.
 * These timestamps are UX-only and never authorize access.
 */

const STORAGE_KEY = "giga3_gigasocial_dm_last_read_v1";
const HIDDEN_THREADS_KEY = "giga3_gigasocial_dm_hidden_threads_v1";

function readMap(key: string): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(key: string, map: Record<string, number>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function getDmThreadLastReadAt(threadId: string): number {
  return readMap(STORAGE_KEY)[threadId] ?? 0;
}

export function markDmThreadRead(threadId: string, at = Date.now()): void {
  const map = readMap(STORAGE_KEY);
  map[threadId] = Math.max(map[threadId] ?? 0, at);
  writeMap(STORAGE_KEY, map);
}

export function isDmThreadUnread(
  threadId: string,
  lastMessageAt: number | null | undefined,
  initiatedByMe: boolean,
  requestStatus: string
): boolean {
  if (lastMessageAt == null) {
    return requestStatus === "open" && !initiatedByMe;
  }
  return lastMessageAt > getDmThreadLastReadAt(threadId);
}

/** Local hide after block (M1 workaround — server still may return the thread). */
export function hideDmThreadLocally(threadId: string): void {
  const map = readMap(HIDDEN_THREADS_KEY);
  map[threadId] = Date.now();
  writeMap(HIDDEN_THREADS_KEY, map);
}

export function isDmThreadHiddenLocally(threadId: string): boolean {
  return Boolean(readMap(HIDDEN_THREADS_KEY)[threadId]);
}

export function listHiddenDmThreadIds(): string[] {
  return Object.keys(readMap(HIDDEN_THREADS_KEY));
}
