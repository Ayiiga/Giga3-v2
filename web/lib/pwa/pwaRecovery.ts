/**
 * Safe PWA recovery — clears stale caches without wiping auth or chat outboxes.
 */

const AUTH_KEYS = [
  "giga3_user_email",
  "giga3_session_token",
  "giga3_supabase_access_token",
] as const;

const RECOVERY_COUNTER_KEY = "giga3_pwa_recovery_count";
const RECOVERY_WINDOW_KEY = "giga3_pwa_recovery_window";
const MAX_RECOVERIES_PER_HOUR = 3;

function snapshotAuth(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const saved: Record<string, string> = {};
  for (const key of AUTH_KEYS) {
    const value = localStorage.getItem(key);
    if (value) saved[key] = value;
  }
  try {
    const admin = sessionStorage.getItem("giga3_admin_session");
    if (admin) saved.giga3_admin_session = admin;
  } catch {
    /* ignore */
  }
  return saved;
}

function restoreAuth(saved: Record<string, string>): void {
  for (const key of AUTH_KEYS) {
    const value = saved[key];
    if (value) localStorage.setItem(key, value);
  }
  if (saved.giga3_admin_session) {
    try {
      sessionStorage.setItem("giga3_admin_session", saved.giga3_admin_session);
    } catch {
      /* ignore */
    }
  }
}

function canRecover(): boolean {
  try {
    const windowStart = Number(sessionStorage.getItem(RECOVERY_WINDOW_KEY) || "0");
    const count = Number(sessionStorage.getItem(RECOVERY_COUNTER_KEY) || "0");
    const now = Date.now();
    if (!windowStart || now - windowStart > 60 * 60 * 1000) {
      sessionStorage.setItem(RECOVERY_WINDOW_KEY, String(now));
      sessionStorage.setItem(RECOVERY_COUNTER_KEY, "0");
      return true;
    }
    return count < MAX_RECOVERIES_PER_HOUR;
  } catch {
    return true;
  }
}

function recordRecovery(): void {
  try {
    const count = Number(sessionStorage.getItem(RECOVERY_COUNTER_KEY) || "0") + 1;
    sessionStorage.setItem(RECOVERY_COUNTER_KEY, String(count));
  } catch {
    /* ignore */
  }
}

/** Clear SW caches and reload once, preserving sign-in tokens. */
export async function safePwaRecovery(targetHref = "/"): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!canRecover()) return false;

  const auth = snapshotAuth();
  recordRecovery();

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }

    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready.catch(() => null);
      registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
    }

    restoreAuth(auth);

    const url = new URL(targetHref, window.location.origin);
    url.searchParams.set("_recovery", String(Date.now()));
    window.location.replace(url.toString());
    return true;
  } catch {
    restoreAuth(auth);
    return false;
  }
}

/** Full reset for 404 / error UI — still preserves auth keys. */
export async function clearCachesAndReload(targetHref = "/"): Promise<void> {
  await safePwaRecovery(targetHref);
}
