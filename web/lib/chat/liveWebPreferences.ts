/** Client-side Live Web preferences — no secrets. */

export type LiveWebMode = "research" | "actions";

const STORAGE_KEY = "giga3_live_web_enabled";
const MODE_STORAGE_KEY = "giga3_live_web_mode";

export function readLiveWebEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeLiveWebEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore quota errors */
  }
}

export function readLiveWebMode(): LiveWebMode {
  if (typeof window === "undefined") return "research";
  try {
    const value = window.localStorage.getItem(MODE_STORAGE_KEY);
    return value === "actions" ? "actions" : "research";
  } catch {
    return "research";
  }
}

export function writeLiveWebMode(mode: LiveWebMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function liveWebUnavailableMessage(online: boolean): string | null {
  if (!online) return "Live web is unavailable while offline.";
  return null;
}
