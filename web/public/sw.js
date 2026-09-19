/**
 * Giga3 AI PWA service worker — static export on Cloudflare Pages.
 * Bump CACHE_VERSION on every deploy that changes JS/CSS or routing.
 */
const CACHE_VERSION = "giga3-v259-pwa-hardening";
/** Legacy name kept for tests + cache inspection tools (giga3-shell-vNNN). */
const CACHE_NAME = "giga3-shell-v259-pwa-hardening";
const NEXT_STATIC_CACHE = `${CACHE_VERSION}-next-static`;
const APP_SHELL_CACHE = `${CACHE_VERSION}-app-shell`;
const OFFLINE_URL = "/offline.html";

const NETWORK_TIMEOUT_MS = 15000;
const NAV_RETRY_DELAY_MS = 800;

const BADGE_DB = "giga3-badge-v1";
const BADGE_STORE = "meta";
const BADGE_KEY = "count";

/** Public marketing/shell routes only — never precache authenticated app surfaces. */
const PRECACHE = [
  "/",
  OFFLINE_URL,
  "/manifest.json",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/favicon.svg",
  "/images/logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/badge-72.png",
  "/icons/apple-touch-icon.png",
  "/icons/icon-maskable-512.png",
  "/pricing/",
  "/subscribe/",
  "/chat/login/",
  "/gigaedit/",
  "/gigalearn/",
];

function isNeverCacheDocumentPath(pathname) {
  return (
    pathname === "/chat" ||
    pathname.startsWith("/chat/") ||
    pathname === "/workspace" ||
    pathname.startsWith("/workspace/") ||
    pathname.startsWith("/payment/") ||
    pathname.startsWith("/credits/") ||
    pathname.startsWith("/admin/")
  );
}

function isSensitiveDocumentPath(pathname) {
  return (
    isNeverCacheDocumentPath(pathname) ||
    pathname.startsWith("/wallet/") ||
    pathname.startsWith("/marketplace/sell/") ||
    pathname.startsWith("/marketplace/purchases/") ||
    pathname.startsWith("/creator-studio/") ||
    pathname.startsWith("/creator/")
  );
}

function isOfflineAppShellPath(pathname) {
  if (pathname.startsWith("/chat/login")) return false;
  return (
    pathname === "/chat" ||
    pathname.startsWith("/chat/") ||
    pathname === "/gigasocial" ||
    pathname.startsWith("/gigasocial/") ||
    pathname === "/gigalearn" ||
    pathname.startsWith("/gigalearn/") ||
    pathname === "/gigaedit" ||
    pathname.startsWith("/gigaedit/")
  );
}

function isNextStaticAsset(pathname) {
  return pathname.startsWith("/_next/static/");
}

function isNextChunk(pathname) {
  return pathname.startsWith("/_next/");
}

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/splash/") ||
    pathname.startsWith("/images/") ||
    /\.(?:js|css|woff2?|png|svg|webp|ico|json|webmanifest)$/.test(pathname)
  );
}

function isApiPath(pathname) {
  return pathname.startsWith("/api/");
}

/** Fetch with AbortController timeout — avoids hanging until browser kills connection. */
function fetchWithTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage(message);
  }
}

/** Stale chunk from previous deploy — purge SW caches and ask clients to hard-reload once. */
async function handleStaleChunk(request) {
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  } catch {
    /* ignore */
  }
  await notifyClients({ type: "GIGA3_CHUNK_STALE", url: request.url });
}

async function networkFirstNavigation(request) {
  const url = new URL(request.url);
  const neverCache = isNeverCacheDocumentPath(url.pathname);
  const sensitive = isSensitiveDocumentPath(url.pathname);
  const appShell = isOfflineAppShellPath(url.pathname) && !neverCache;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS);
      if (response.ok) {
        if (!sensitive && !neverCache && !appShell) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        if (appShell) {
          const clone = response.clone();
          caches.open(APP_SHELL_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      }
      if (response.status === 404) {
        return response;
      }
    } catch {
      if (attempt === 0) await sleep(NAV_RETRY_DELAY_MS);
    }
  }

  if (appShell) {
    const appCached = await caches.open(APP_SHELL_CACHE).then((cache) => cache.match(request));
    if (appCached) return appCached;
  }

  const cached = await caches.match(request);
  if (cached) return cached;

  const offline = await caches.match(OFFLINE_URL);
  if (offline) return offline;

  return jsonResponse({ error: "offline", offline: true }, 503);
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  const networkUpdate = fetch(request)
    .then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    void networkUpdate;
    return cached;
  }

  const response = await networkUpdate;
  return response || caches.match(OFFLINE_URL);
}

async function networkFirstNextStatic(request) {
  try {
    const response = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS);
    if (response.ok) {
      const clone = response.clone();
      caches.open(NEXT_STATIC_CACHE).then((cache) => cache.put(request, clone));
      return response;
    }
    if (response.status === 404 && request.url.includes(".js")) {
      await handleStaleChunk(request);
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.url.includes(".js")) {
      await handleStaleChunk(request);
    }
    throw new Error("chunk unavailable");
  }
}

// --- Install / activate ---

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).catch((err) => {
      console.error("[sw] precache failed", err);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (k) =>
                k !== CACHE_NAME && k !== NEXT_STATIC_CACHE && k !== APP_SHELL_CACHE
            )
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
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

// --- Fetch ---

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isApiPath(url.pathname)) {
    event.respondWith(
      fetchWithTimeout(request, NETWORK_TIMEOUT_MS)
        .then((response) => response)
        .catch(() => jsonResponse({ error: "offline" }, 503))
    );
    return;
  }

  if (isNextStaticAsset(url.pathname)) {
    event.respondWith(networkFirstNextStatic(request));
    return;
  }

  if (isNextChunk(url.pathname)) {
    event.respondWith(
      fetchWithTimeout(request, NETWORK_TIMEOUT_MS).catch(async () => {
        await handleStaleChunk(request);
        return jsonResponse({ error: "chunk_load_failed" }, 404);
      })
    );
    return;
  }

  const isDocument =
    request.mode === "navigate" ||
    request.headers.get("accept")?.includes("text/html");

  if (isDocument) {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstStatic(request));
    return;
  }

  event.respondWith(
    fetchWithTimeout(request, NETWORK_TIMEOUT_MS).catch(() => caches.match(request))
  );
});

// --- Badge helpers ---

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

// --- Background sync ---

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

// --- Push notifications ---

self.addEventListener("push", (event) => {
  const d = (() => {
    try {
      return event.data?.json() ?? {};
    } catch {
      return {};
    }
  })();
  const payload = {
    title: d.title || "Giga3 AI",
    body: d.body || "New message",
    url: d.url || "/chat/",
    tag: d.tag || "giga3",
    badgeCount: d.badgeCount,
    badgeIncrement: d.badgeIncrement ?? 1,
  };
  event.waitUntil(
    (async () => {
      const visible = await anyClientVisible();
      if (!visible) {
        if (typeof payload.badgeCount === "number") {
          await setAppBadgeCount(payload.badgeCount);
        } else {
          await bumpAppBadge(payload.badgeIncrement);
        }
      }
      await self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: "/icons/icon-512.png",
        badge: "/icons/badge-72.png",
        vibrate: [200, 100, 200],
        data: { url: payload.url, tag: payload.tag },
        requireInteraction: true,
        tag: payload.tag,
        renotify: true,
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
      const existing = clients.find((client) =>
        client.url.includes(self.location.origin)
      );
      if (existing && "focus" in existing) {
        await existing.focus();
        if ("navigate" in existing) {
          return existing.navigate(target);
        }
        return undefined;
      }
      return self.clients.openWindow(target);
    })()
  );
});
