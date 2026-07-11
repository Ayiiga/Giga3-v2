/** Detect and recover from stale Next.js chunk loads after deploy / PWA cache drift. */

const RECOVERY_KEY = "giga3_chunk_recovery_v1";

export function isChunkLoadError(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : String(err ?? "");
  return (
    /Loading chunk [\d]+ failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg)
  );
}

export function chunkLoadUserMessage(): string {
  return "The app was updated. Refreshing to load the latest version…";
}

/** Clear PWA caches and hard-reload once per session to fetch fresh bundles. */
export async function recoverFromStaleChunks(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    if (sessionStorage.getItem(RECOVERY_KEY) === "1") {
      sessionStorage.removeItem(RECOVERY_KEY);
      return false;
    }
    sessionStorage.setItem(RECOVERY_KEY, "1");

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }

    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    const url = new URL(window.location.href);
    url.searchParams.set("_refresh", String(Date.now()));
    window.location.replace(url.toString());
    return true;
  } catch {
    sessionStorage.removeItem(RECOVERY_KEY);
    return false;
  }
}
