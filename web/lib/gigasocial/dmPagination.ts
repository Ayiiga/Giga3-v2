/**
 * Safe DM history pagination helpers for Phase 2C M2.
 * Never treat an empty filtered page as end-of-history.
 */

export type DmHistoryPageResult = {
  /** Append these (already oldest→newest or newest→oldest — caller decides). */
  messages: Array<{ messageId: string; createdAt: number }>;
  nextCursor: number | null;
};

export type DmHistoryLoadOutcome =
  | { kind: "appended"; nextCursor: number | null; exhausted: boolean }
  | { kind: "empty_not_exhausted"; retry: true }
  | { kind: "exhausted" };

/**
 * Interpret a page load when fetching older messages with a cursor.
 * - Non-empty + null cursor → end of history
 * - Non-empty + cursor → more may exist
 * - Empty while a cursor was requested → NOT end (M2); caller should retry
 * - Empty on first load (no prior cursor) → exhausted (no messages)
 */
export function interpretDmHistoryPage(
  page: DmHistoryPageResult,
  opts: { usedCursor: boolean }
): DmHistoryLoadOutcome {
  if (page.messages.length > 0) {
    if (page.nextCursor == null) {
      return { kind: "appended", nextCursor: null, exhausted: true };
    }
    return { kind: "appended", nextCursor: page.nextCursor, exhausted: false };
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
