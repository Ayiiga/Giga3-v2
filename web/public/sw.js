const CACHE_NAME = "giga3-shell-v31-thinking-hang-fix";

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
    pathname.startsWith("/creator/")
  );
}

self.addEventListener("install", (event) => {
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

  const isStatic =
    url.pathname.startsWith("/_next/") ||
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
