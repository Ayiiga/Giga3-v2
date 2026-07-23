"use client";

/**
 * Network status used to surface a fixed toast ("Checking connection…", offline,
 * queued messages). Sync/outbox still run in the background — the chrome stays
 * silent so flaky 3G does not interrupt chat.
 */
export function OfflineBanner() {
  return null;
}
