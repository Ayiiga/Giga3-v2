/** Crash/shake stability — refresh installed PWAs. */
const CACHE_NAME = "giga3-shell-v186-stabilize";
const NEXT_STATIC_CACHE = "giga3-next-static-v186";
const BADGE_DB = "giga3-badge-v1";
const BADGE_STORE = "meta";
const BADGE_KEY = "count";

/** Public marketing/shell routes only — never precache authenticated app surfaces. */
const PRECACHE = [
  "/",
  "/offline/",
  "/manifest.json",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/favicon.svg",
  "/images/logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/icon-maskable-512.png",
  "/pricing/",
  "/subscribe/",
  "/chat/login/",
];

/**
 * Documents that must never be stored offline (billing / admin / creator tools).
 * Chat + GigaSocial shells are intentionally excluded — see isOfflineAppShellPath.
 */
function isSensitiveDocumentPath(pathname) {
  return (
    pathname.startsWith("/payment/") ||
    pathname.startsWith("/credits/") ||
    pathname.startsWith("/wallet/") ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/marketplace/sell/") ||
    pathname.startsWith("/creator-studio/") ||
    pathname.startsWith("/gigalearn/") ||
    pathname.startsWith("/creator/")
  );
}

/** App shells that may be runtime-cached after an online visit for offline reopen. */
function isOfflineAppShellPath(pathname) {
  if (pathname.startsWith("/chat/login")) return false;
  return (
    pathname === "/chat" ||
    pathname.startsWith("/chat/") ||
    pathname === "/gigasocial" ||
    pathname.startsWith("/gigasocial/")
  );
}

function isNextStaticAsset(pathname) {
  return pathname.startsWith("/_next/static/");
}

function isNextChunk(pathname) {
  return pathname.startsWith("/_next/");
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (event.data?.type === "GIGA3_CLEAR_BADGE") {
    event.waitUntil(clearAppBadge());
    return;
  }
  if (event.data?.type === "GIGA3_SET_BADGE") {
    const count = Number(event.data.count) || 0;
    event.waitUntil(setAppBadgeCount(count));
    return;
  }
  if (event.data?.type === "GIGA3_BUMP_BADGE") {
    const delta = Number(event.data.delta) || 1;
    event.waitUntil(bumpAppBadge(delta));
  }
});

function openBadgeDb() {
  return new Promise((resolve) => {
    if (!self.indexedDB) {
      resolve(null);
      return;
    }
    const req = self.indexedDB.open(BADGE_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(BADGE_STORE)) {
        db.createObjectStore(BADGE_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

function readBadgeCount() {
  return openBadgeDb().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) {
          resolve(0);
          return;
        }
        try {
          const tx = db.transaction(BADGE_STORE, "readonly");
          const req = tx.objectStore(BADGE_STORE).get(BADGE_KEY);
          req.onsuccess = () => {
            const value = req.result;
            resolve(typeof value === "number" && value > 0 ? value : 0);
          };
          req.onerror = () => resolve(0);
        } catch {
          resolve(0);
        }
      })
  );
}

function writeBadgeCount(count) {
  return openBadgeDb().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) {
          resolve();
          return;
        }
        try {
          const tx = db.transaction(BADGE_STORE, "readwrite");
          tx.objectStore(BADGE_STORE).put(Math.max(0, Math.floor(count)), BADGE_KEY);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      })
  );
}

async function applyRegistrationBadge(count) {
  const safe = Math.max(0, Math.min(99, Math.floor(count)));
  try {
    if (safe <= 0) {
      if (typeof self.registration.clearAppBadge === "function") {
        await self.registration.clearAppBadge();
      }
    } else if (typeof self.registration.setAppBadge === "function") {
      await self.registration.setAppBadge(safe);
    }
  } catch {
    /* unsupported */
  }
}

async function setAppBadgeCount(count) {
  await writeBadgeCount(count);
  await applyRegistrationBadge(count);
}

async function clearAppBadge() {
  await writeBadgeCount(0);
  await applyRegistrationBadge(0);
}

async function bumpAppBadge(delta) {
  const next = (await readBadgeCount()) + Math.max(1, Number(delta) || 1);
  await setAppBadgeCount(next);
  return next;
}

async function anyClientVisible() {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  return clients.some((client) => client.visibilityState === "visible");
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME && k !== NEXT_STATIC_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isDocument =
    request.mode === "navigate" ||
    request.headers.get("accept")?.includes("text/html");

  // Hashed Next bundles: network-first when online, cache fallback offline.
  // Content hashes avoid serving wrong deploys for a given filename.
  if (isNextStaticAsset(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(NEXT_STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Other /_next/ paths (build manifests, etc.) — never cache.
  if (isNextChunk(url.pathname)) {
    event.respondWith(fetch(request));
    return;
  }

  const isStatic =
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/splash/") ||
    url.pathname.startsWith("/images/") ||
    /\.(?:js|css|woff2?|png|svg|webp|ico|json|webmanifest)$/.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  if (isDocument) {
    const sensitive = isSensitiveDocumentPath(url.pathname);
    const appShell = isOfflineAppShellPath(url.pathname);

    event.respondWith(
      fetch(request)
        .then((response) => {
          // Never runtime-cache chat/GigaSocial HTML — stale shells cause shake/crashes after deploys.
          // Marketing/public docs may still be cached for offline reopen.
          if (response.ok && !sensitive && !appShell) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          if (sensitive || appShell) {
            return caches.match("/offline/");
          }
          return caches
            .match(request)
            .then((cached) => cached || caches.match("/offline/"));
        })
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

/** Background Sync — nudge open clients to flush IndexedDB outboxes. */
self.addEventListener("sync", (event) => {
  if (event.tag !== "giga3-chat-outbox" && event.tag !== "giga3-social-outbox") {
    return;
  }
  const messageType =
    event.tag === "giga3-social-outbox"
      ? "GIGA3_FLUSH_SOCIAL_OUTBOX"
      : "GIGA3_FLUSH_OUTBOX";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        client.postMessage({ type: messageType });
      }
    })
  );
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "Giga3 AI",
    body: "New update available.",
    url: "/chat/",
    tag: "giga3-default",
    badgeCount: undefined,
    badgeIncrement: 1,
  };
  try {
    payload = { ...payload, ...(event.data ? event.data.json() : {}) };
  } catch {
    /* ignore malformed payloads */
  }
  const tag = payload.tag || `giga3-${Date.now()}`;
  event.waitUntil(
    (async () => {
      const visible = await anyClientVisible();
      if (!visible) {
        if (typeof payload.badgeCount === "number") {
          await setAppBadgeCount(payload.badgeCount);
        } else {
          await bumpAppBadge(payload.badgeIncrement ?? 1);
        }
      }
      await self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag,
        renotify: true,
        data: {
          url: payload.url || "/chat/",
          tag,
          badgeCount: payload.badgeCount,
        },
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/chat/";
  event.waitUntil(
    (async () => {
      await clearAppBadge();
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clients) {
        if ("focus" in client && "navigate" in client) {
          await client.focus();
          return client.navigate(target);
        }
        if ("focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })()
  );
});
