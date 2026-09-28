/** Detect and recover from stale Next.js chunk loads after deploy / PWA cache drift. */

import { safePwaRecovery } from "@/lib/pwa/pwaRecovery";

const RECOVERY_KEY = "giga3_chunk_recovery_v2";

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
    /error loading dynamically imported module/i.test(msg) ||
    /chunk_load_failed/i.test(msg) ||
    /chunk unavailable/i.test(msg)
  );
}

export function chunkLoadUserMessage(): string {
  return "The app was updated. Refreshing to load the latest version…";
}

function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/**
 * Clear PWA caches and hard-reload once per session to fetch fresh bundles.
 * Preserves auth tokens — skips destructive recovery while offline.
 */
export async function recoverFromStaleChunks(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (isBrowserOffline()) return false;

  try {
    if (sessionStorage.getItem(RECOVERY_KEY) === "1") {
      sessionStorage.removeItem(RECOVERY_KEY);
      return false;
    }
    sessionStorage.setItem(RECOVERY_KEY, "1");
    return await safePwaRecovery(window.location.pathname || "/");
  } catch {
    sessionStorage.removeItem(RECOVERY_KEY);
    return false;
  }
}

/** Called when the service worker detects a stale hashed chunk (404). */
export function recoverFromServiceWorkerStaleChunk(): void {
  if (typeof window === "undefined") return;
  if (isBrowserOffline()) return;
  void recoverFromStaleChunks();
}
