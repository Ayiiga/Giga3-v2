const CACHE_NAME = "giga3-shell-v131-no-auto-video-switch";

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

/** Document paths that must not be stored offline (session / billing / creator tools). */
function isSensitiveDocumentPath(pathname) {
  return (
    pathname.startsWith("/chat/") ||
    pathname.startsWith("/payment/") ||
    pathname.startsWith("/credits/") ||
    pathname.startsWith("/marketplace/sell/") ||
    pathname.startsWith("/creator-studio/") ||
    pathname.startsWith("/gigalearn/") ||
    pathname.startsWith("/gigasocial/") ||
    pathname.startsWith("/creator/")
  );
}

function isNextChunk(pathname) {
  return pathname.startsWith("/_next/");
}

/** Drop stale JS/CSS bundles so a deleted Convex URL cannot linger in cache. */
async function purgeNextChunks() {
  const keys = await caches.keys();
  await Promise.all(
    keys.map(async (key) => {
      const cache = await caches.open(key);
      const requests = await cache.keys();
      await Promise.all(
        requests
          .filter((req) => isNextChunk(new URL(req.url).pathname))
          .map((req) => cache.delete(req))
      );
    })
  );
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
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => purgeNextChunks())
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

  if (isNextChunk(url.pathname)) {
    // Never cache app bundles — stale chunks cause "Loading chunk N failed" after deploy.
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
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && !sensitive) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          if (sensitive) {
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

/** Background Sync — nudge open chat clients to flush IndexedDB outbox. */
self.addEventListener("sync", (event) => {
  if (event.tag !== "giga3-chat-outbox") return;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        client.postMessage({ type: "GIGA3_FLUSH_OUTBOX" });
      }
    })
  );
});

self.addEventListener("push", (event) => {
  let payload = { title: "Giga3 AI", body: "New update available.", url: "/chat/", tag: "giga3-default" };
  try {
    payload = { ...payload, ...(event.data ? event.data.json() : {}) };
  } catch {
    /* ignore malformed payloads */
  }
  const tag = payload.tag || `giga3-${Date.now()}`;
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag,
      renotify: false,
      data: { url: payload.url || "/chat/", tag },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/chat/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client && "navigate" in client) {
          return client.focus().then(() => client.navigate(target));
        }
        if ("focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
