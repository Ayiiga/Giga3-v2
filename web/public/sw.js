/**
 * Giga3 AI PWA service worker — Cloudflare Pages static export.
 * Bump CACHE_VERSION on every deploy that changes JS/CSS.
 */
const CACHE_VERSION = "giga3-v8";
const OFFLINE_URL = "/offline.html";
const NETWORK_TIMEOUT_MS = 15000;

const PRECACHE = ["/", OFFLINE_URL, "/manifest.json", "/manifest.webmanifest"];

const BADGE_DB = "giga3-badge-v1";
const BADGE_STORE = "meta";
const BADGE_KEY = "count";

function fetchWithTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

function jsonOffline() {
  return new Response(JSON.stringify({ error: "offline" }), {
    status: 503,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clients) client.postMessage(message);
}

async function handleStaleChunk(request) {
  const keys = await caches.keys();
  await Promise.all(keys.filter((k) => k.startsWith("giga3")).map((k) => caches.delete(k)));
  await notifyClients({ type: "GIGA3_CHUNK_STALE", url: request.url });
}

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/images/") ||
    /\.(?:js|css|woff2?|png|svg|webp|ico)$/.test(pathname)
  );
}

function isDocument(request) {
  return (
    request.mode === "navigate" ||
    request.headers.get("accept")?.includes("text/html")
  );
}

// --- Lifecycle ---

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(function () {
        self.skipWaiting();
      })
      .catch((err) => console.error("[sw] precache failed", err))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
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
    event.waitUntil(setAppBadgeCount(Number(event.data.count) || 0));
    return;
  }
  if (event.data?.type === "GIGA3_BUMP_BADGE") {
    event.waitUntil(bumpAppBadge(Number(event.data.delta) || 1));
  }
});

// --- Fetch ---

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // (a) API — network-only, never cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetchWithTimeout(request, NETWORK_TIMEOUT_MS).catch(() => jsonOffline())
    );
    return;
  }

  // (b) Navigation — network-first, then cache, then offline.html
  if (isDocument(request)) {
    event.respondWith(
      fetchWithTimeout(request, NETWORK_TIMEOUT_MS)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          return offline || jsonOffline();
        })
    );
    return;
  }

  // (c) Static — cache-first, then network, update cache
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        try {
          const response = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS);
          if (response.status === 404 && url.pathname.endsWith(".js")) {
            await handleStaleChunk(request);
          }
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return response.ok ? response : cached || response;
        } catch {
          if (url.pathname.endsWith(".js")) await handleStaleChunk(request);
          return cached || jsonOffline();
        }
      })
    );
    return;
  }

  event.respondWith(
    fetchWithTimeout(request, NETWORK_TIMEOUT_MS).catch(() => caches.match(request))
  );
});

// --- Badge (push launcher) ---

function openBadgeDb() {
  return new Promise((resolve) => {
    if (!self.indexedDB) return resolve(null);
    const req = self.indexedDB.open(BADGE_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(BADGE_STORE)) db.createObjectStore(BADGE_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

function readBadgeCount() {
  return openBadgeDb().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) return resolve(0);
        try {
          const tx = db.transaction(BADGE_STORE, "readonly");
          const req = tx.objectStore(BADGE_STORE).get(BADGE_KEY);
          req.onsuccess = () => {
            const v = req.result;
            resolve(typeof v === "number" && v > 0 ? v : 0);
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
        if (!db) return resolve();
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
    if (safe <= 0 && typeof self.registration.clearAppBadge === "function") {
      await self.registration.clearAppBadge();
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
  await setAppBadgeCount((await readBadgeCount()) + Math.max(1, delta || 1));
}

async function anyClientVisible() {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  return clients.some((c) => c.visibilityState === "visible");
}

// --- Background sync ---

self.addEventListener("sync", (event) => {
  if (event.tag !== "giga3-chat-outbox" && event.tag !== "giga3-social-outbox") return;
  const messageType =
    event.tag === "giga3-social-outbox" ? "GIGA3_FLUSH_SOCIAL_OUTBOX" : "GIGA3_FLUSH_OUTBOX";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) client.postMessage({ type: messageType });
    })
  );
});

// --- Push ---

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
      if (!(await anyClientVisible())) {
        if (typeof payload.badgeCount === "number") await setAppBadgeCount(payload.badgeCount);
        else await bumpAppBadge(payload.badgeIncrement);
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
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = clients.find((c) => c.url.includes(self.location.origin));
      if (existing && "focus" in existing) {
        await existing.focus();
        if ("navigate" in existing) return existing.navigate(target);
        return undefined;
      }
      return self.clients.openWindow(target);
    })()
  );
});
