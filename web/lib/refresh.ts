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

  const path = window.location.pathname;
  // Full reload on chat causes flicker, scroll jumps, and lost composer state.
  if (path.startsWith("/chat")) {
    return;
  }

  window.location.reload();
}
