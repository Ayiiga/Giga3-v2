/**
 * Lazy OneSignal Web SDK loader for blog push (Custom Code / v16).
 * Uses a subdirectory service worker so it does not replace /sw.js.
 *
 * Init / worker registration happens only from subscribe/unsubscribe (explicit
 * blog actions). Mount-time UI must use `hasBlogPushOptedInMarker()` instead of
 * calling `ensureBlogPushInitialized()`.
 */

import {
  BLOG_PUSH_SW_PATH,
  BLOG_PUSH_SW_SCOPE,
  getOneSignalAppId,
  hasBlogPushOptedInMarker,
  isBlogPushEnabled,
} from "@/lib/blog/blogPushConfig";

export type BlogPushPermission = "default" | "granted" | "denied" | "unsupported";

export type OneSignalLike = {
  init: (options: Record<string, unknown>) => Promise<void>;
  Notifications?: {
    permission?: boolean | string;
    permissionNative?: string;
    requestPermission?: () => Promise<string | boolean | void>;
  };
  User?: {
    PushSubscription?: {
      optedIn?: boolean;
      optIn?: () => Promise<void>;
      optOut?: () => Promise<void>;
    };
  };
};

declare global {
  interface Window {
    OneSignalDeferred?: Array<(oneSignal: OneSignalLike) => void | Promise<void>>;
    OneSignal?: OneSignalLike;
  }
}

let initPromise: Promise<OneSignalLike | null> | null = null;
let scriptLoading: Promise<void> | null = null;

export function getBlogPushPermission(): BlogPushPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  const p = Notification.permission;
  if (p === "granted" || p === "denied" || p === "default") return p;
  return "unsupported";
}

export function isBlogPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;
  return true;
}

function loadSdkScript(): Promise<void> {
  if (scriptLoading) return scriptLoading;
  scriptLoading = new Promise<void>((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("No document"));
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>("script[data-giga3-onesignal]");
    if (existing) {
      if (existing.dataset.loaded === "1") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("OneSignal SDK failed to load")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.async = true;
    script.dataset.giga3Onesignal = "1";
    script.onload = () => {
      script.dataset.loaded = "1";
      resolve();
    };
    script.onerror = () => reject(new Error("OneSignal SDK failed to load"));
    document.head.appendChild(script);
  });
  return scriptLoading;
}

/** Initialize once. Safe to call repeatedly. Returns null when disabled/unsupported. */
export async function ensureBlogPushInitialized(): Promise<OneSignalLike | null> {
  if (!isBlogPushEnabled()) return null;
  if (!isBlogPushSupported()) return null;
  const appId = getOneSignalAppId();
  if (!appId) return null;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await loadSdkScript();
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      return await new Promise<OneSignalLike | null>((resolve) => {
        window.OneSignalDeferred!.push(async (OneSignal) => {
          try {
            await OneSignal.init({
              appId,
              serviceWorkerPath: BLOG_PUSH_SW_PATH,
              serviceWorkerParam: { scope: BLOG_PUSH_SW_SCOPE },
              promptOptions: { slidedown: { prompts: [] } },
              notifyButton: { enable: false },
              allowLocalhostAsSecureOrigin:
                typeof window !== "undefined" &&
                (window.location.hostname === "localhost" ||
                  window.location.hostname === "127.0.0.1"),
            });
            resolve(OneSignal);
          } catch {
            initPromise = null;
            resolve(null);
          }
        });
      });
    } catch {
      initPromise = null;
      return null;
    }
  })();

  return initPromise;
}

export async function subscribeBlogPush(): Promise<{
  ok: boolean;
  permission: BlogPushPermission;
  error?: string;
}> {
  if (!isBlogPushEnabled()) {
    return { ok: false, permission: getBlogPushPermission(), error: "disabled" };
  }
  if (!isBlogPushSupported()) {
    return { ok: false, permission: "unsupported", error: "unsupported" };
  }

  const oneSignal = await ensureBlogPushInitialized();
  if (!oneSignal) {
    return { ok: false, permission: getBlogPushPermission(), error: "init_failed" };
  }

  try {
    // Native prompt only when still undecided — never re-prompt when already granted/denied.
    if (Notification.permission === "default") {
      if (oneSignal.Notifications?.requestPermission) {
        await oneSignal.Notifications.requestPermission();
      } else {
        await Notification.requestPermission();
      }
    }

    const permission = getBlogPushPermission();
    if (permission === "denied") {
      return { ok: false, permission, error: "denied" };
    }
    if (permission !== "granted") {
      return { ok: false, permission, error: "not_granted" };
    }

    await oneSignal.User?.PushSubscription?.optIn?.();
    return { ok: true, permission: "granted" };
  } catch (err) {
    return {
      ok: false,
      permission: getBlogPushPermission(),
      error: err instanceof Error ? err.message : "subscribe_failed",
    };
  }
}

export async function unsubscribeBlogPush(): Promise<{ ok: boolean; error?: string }> {
  if (!isBlogPushEnabled()) return { ok: true };
  try {
    const oneSignal = await ensureBlogPushInitialized();
    await oneSignal?.User?.PushSubscription?.optOut?.();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unsubscribe_failed",
    };
  }
}

/**
 * Blog-specific opted-in status for UI only — reads the local marker.
 * Does **not** initialize OneSignal or register its service worker.
 */
export function isBlogPushOptedIn(): boolean {
  if (!isBlogPushEnabled()) return false;
  return hasBlogPushOptedInMarker();
}

/** Test-only reset of module singletons. */
export function __resetBlogPushClientForTests(): void {
  initPromise = null;
  scriptLoading = null;
}
