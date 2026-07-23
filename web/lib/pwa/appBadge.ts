/** App icon badge helpers for installed PWAs (Badging API). */

const BADGE_STORE = "giga3-badge-v1";
const BADGE_KEY = "count";

function openBadgeDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const req = indexedDB.open(BADGE_STORE, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function readStoredBadgeCount(): Promise<number> {
  const db = await openBadgeDb();
  if (!db) return 0;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction("meta", "readonly");
      const req = tx.objectStore("meta").get(BADGE_KEY);
      req.onsuccess = () => {
        const value = req.result;
        resolve(typeof value === "number" && value > 0 ? value : 0);
      };
      req.onerror = () => resolve(0);
    } catch {
      resolve(0);
    }
  });
}

async function writeStoredBadgeCount(count: number): Promise<void> {
  const db = await openBadgeDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction("meta", "readwrite");
      tx.objectStore("meta").put(Math.max(0, Math.floor(count)), BADGE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function applyAppBadge(count: number): Promise<void> {
  const safe = Math.max(0, Math.min(99, Math.floor(count)));
  try {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (safe <= 0) {
      if (typeof nav.clearAppBadge === "function") await nav.clearAppBadge();
    } else if (typeof nav.setAppBadge === "function") {
      await nav.setAppBadge(safe);
    }
  } catch {
    /* unsupported / denied */
  }
}

export async function bumpAppBadge(delta = 1): Promise<number> {
  const next = (await readStoredBadgeCount()) + Math.max(1, delta);
  await writeStoredBadgeCount(next);
  await applyAppBadge(next);
  return next;
}

export async function setAppBadgeCount(count: number): Promise<void> {
  await writeStoredBadgeCount(count);
  await applyAppBadge(count);
}

export async function clearAppBadgeCount(): Promise<void> {
  await writeStoredBadgeCount(0);
  await applyAppBadge(0);
}

export function postBadgeMessageToServiceWorker(
  type: "GIGA3_SET_BADGE" | "GIGA3_CLEAR_BADGE" | "GIGA3_BUMP_BADGE",
  count?: number
): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const controller = navigator.serviceWorker.controller;
  if (!controller) return;
  controller.postMessage(
    type === "GIGA3_SET_BADGE"
      ? { type, count: count ?? 0 }
      : type === "GIGA3_BUMP_BADGE"
        ? { type, delta: count ?? 1 }
        : { type }
  );
}
