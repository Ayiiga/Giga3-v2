/** Shared refresh handler — hard reload only (no SW update loop). */
export async function refreshApp(): Promise<void> {
  if (typeof window === "undefined") return;
  window.location.reload();
}
