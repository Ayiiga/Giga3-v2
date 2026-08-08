/**
 * Soft attention indicator after ~24h away.
 * Not a fake notification count — clears as soon as the user returns.
 */

const LAST_OPEN_KEY = "giga3_app_last_open_at";
const ATTENTION_MS = 24 * 60 * 60 * 1000;

export const ATTENTION_INACTIVE_MS = ATTENTION_MS;

export function readLastAppOpenAt(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAST_OPEN_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/** True when the user has been away for ~24 hours (or never opened on this device). */
export function shouldShowAttentionDot(now = Date.now()): boolean {
  const last = readLastAppOpenAt();
  if (last == null) return true;
  return now - last >= ATTENTION_MS;
}

/** Call when the app becomes visible — resets the 24h attention window. */
export function recordAppOpen(now = Date.now()): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_OPEN_KEY, String(now));
  } catch {
    /* ignore */
  }
}

/** Optional: OS badge should show at least 1 while attention is due and unread is 0. */
export function attentionBadgeFloor(unreadCount: number, now = Date.now()): number {
  if (unreadCount > 0) return unreadCount;
  return shouldShowAttentionDot(now) ? 1 : 0;
}
