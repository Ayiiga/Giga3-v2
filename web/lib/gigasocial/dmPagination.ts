/**
 * Safe DM history pagination helpers.
 * Compound cursors are opaque strings (`createdAt:messageId`).
 * Never treat an empty filtered page as end-of-history.
 */

export type DmHistoryPageResult = {
  messages: Array<{ messageId: string; createdAt: number }>;
  /** Compound cursor string, or null when exhausted. */
  nextCursor: string | number | null;
};

export type DmHistoryLoadOutcome =
  | { kind: "appended"; nextCursor: string | null; exhausted: boolean }
  | { kind: "empty_not_exhausted"; retry: true }
  | { kind: "exhausted" };

function normalizeCursor(
  cursor: string | number | null | undefined
): string | null {
  if (cursor == null) return null;
  return String(cursor);
}

/**
 * Interpret a page load when fetching older messages with a cursor.
 * - Non-empty + null cursor → end of history
 * - Non-empty + cursor → more may exist
 * - Empty while a cursor was requested → NOT end; caller should retry
 * - Empty on first load (no prior cursor) → exhausted
 */
export function interpretDmHistoryPage(
  page: DmHistoryPageResult,
  opts: { usedCursor: boolean }
): DmHistoryLoadOutcome {
  if (page.messages.length > 0) {
    const next = normalizeCursor(page.nextCursor);
    if (next == null) {
      return { kind: "appended", nextCursor: null, exhausted: true };
    }
    return { kind: "appended", nextCursor: next, exhausted: false };
  }
  if (opts.usedCursor) {
    return { kind: "empty_not_exhausted", retry: true };
  }
  return { kind: "exhausted" };
}

export function newDmClientId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `dm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
