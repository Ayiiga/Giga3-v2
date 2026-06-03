/** Shared refresh handler for pull-to-refresh (PWA-friendly). */
export async function refreshApp(): Promise<void> {
  if (typeof window === "undefined") return;

  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg?.update();
    } catch {
      /* non-fatal */
    }
  }

  window.location.reload();
}
