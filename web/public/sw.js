/** Workspace GigaSocial featured + stability — refresh installed PWAs. */
const CACHE_NAME = "giga3-shell-v175-workspace-social";
const NEXT_STATIC_CACHE = "giga3-next-static-v175";

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
  }
});

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
          // Cache marketing + chat/GigaSocial shells after a successful visit.
          if (response.ok && (appShell || !sensitive)) {
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
