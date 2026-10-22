/** Cloudflare Pages middleware — canonical host, offline shell, 404 status, GigaSocial OG. */

import { apexToWwwRedirect } from "./canonicalHost.js";
import { OFFLINE_PAGE_HTML } from "./offlinePageHtml.js";

const CRAWLER_UA =
  /facebookexternalhit|Facebot|WhatsApp|whatsapp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Googlebot|bingbot|Applebot|Pinterest|Embedly|ia_archiver|Snapchat|SkypeUriPreview|Viber|Line\/|KakaoTalk|redditbot|Quora|MetaInspector|bot|crawl|spider|preview|fetch|link/i;

const DEFAULT_CONVEX_SITE = "https://perfect-lark-521.convex.site";

function isGigaSocialPostPath(pathname) {
  const normalized = pathname.replace(/\/$/, "") || "/";
  if (normalized === "/gigasocial/post") return true;
  return /^\/gigasocial\/post\/[^/]+$/.test(normalized);
}

function parsePostId(pathname, searchParams) {
  const fromQuery = searchParams.get("id")?.trim();
  if (fromQuery) return fromQuery;
  const segments = pathname.replace(/\/$/, "").split("/").filter(Boolean);
  if (segments[0] === "gigasocial" && segments[1] === "post" && segments[2]) {
    if (segments[2] === "og-image" || segments[3] === "og-image") return "";
    return decodeURIComponent(segments[2]).trim();
  }
  return "";
}

function parseOgImagePostId(pathname) {
  const segments = pathname.replace(/\/$/, "").split("/").filter(Boolean);
  if (
    segments[0] === "gigasocial" &&
    segments[1] === "post" &&
    segments[3] === "og-image" &&
    segments[2]
  ) {
    return decodeURIComponent(segments[2]).trim();
  }
  return "";
}

function isOfflineHtmlPath(pathname) {
  return pathname === "/offline.html" || pathname === "/offline.html/";
}

/** Pretty-URL and literal forms of the static export 404 document. */
function isSoft404Path(pathname) {
  return (
    pathname === "/404" ||
    pathname === "/404/" ||
    pathname === "/404.html" ||
    pathname === "/404.html/"
  );
}

/**
 * Follow asset-layer redirects (e.g. /404.html → /404) and return the body
 * so we can re-emit it with a real HTTP 404 status.
 */
async function fetchAssetsFollowingRedirects(context, startPath, maxHops = 4) {
  if (!context.env?.ASSETS) return null;
  let current = new URL(startPath, context.request.url);
  for (let hop = 0; hop < maxHops; hop++) {
    const response = await context.env.ASSETS.fetch(
      new Request(current, { method: "GET", redirect: "manual" })
    );
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("Location");
      if (!location) return null;
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) return null;
    return response;
  }
  return null;
}

async function serveSoft404(context) {
  const assetResponse = await fetchAssetsFollowingRedirects(context, "/404.html");
  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow",
  });
  if (assetResponse) {
    const body = await assetResponse.arrayBuffer();
    return new Response(body, { status: 404, headers });
  }
  return new Response(
    "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\"/><meta name=\"robots\" content=\"noindex, nofollow\"/><title>Page not found</title></head><body><h1>Page not found</h1></body></html>",
    { status: 404, headers }
  );
}

function serveOfflineHtml() {
  return new Response(OFFLINE_PAGE_HTML, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export async function onRequest(context) {
  const redirectTo = apexToWwwRedirect(context.request.url);
  if (redirectTo) return Response.redirect(redirectTo, 301);

  const url = new URL(context.request.url);

  // Soft-404 fix: CF Pages pretty-URLs map 404.html → /404 with HTTP 200.
  // Google reports that as Soft 404. Always emit a real 404 status.
  if (isSoft404Path(url.pathname)) {
    return serveSoft404(context);
  }

  // PWA sw.js precaches /offline.html. Do not use ASSETS.fetch for this path —
  // the asset layer 308s /offline.html → /offline (marketing page) because both exist.
  if (isOfflineHtmlPath(url.pathname)) {
    if (url.pathname === "/offline.html/") {
      return Response.redirect(`${url.origin}/offline.html`, 301);
    }
    return serveOfflineHtml();
  }

  const convexSite = (context.env?.CONVEX_SITE_URL || DEFAULT_CONVEX_SITE).replace(/\/$/, "");

  const ogImagePostId = parseOgImagePostId(url.pathname);
  if (ogImagePostId) {
    const imageUrl = `${convexSite}/gigasocial/post/og-image?id=${encodeURIComponent(ogImagePostId)}`;
    try {
      const response = await fetch(imageUrl, {
        headers: { "User-Agent": context.request.headers.get("User-Agent") || "" },
      });
      if (response.ok) {
        const headers = new Headers(response.headers);
        headers.set("Cache-Control", "public, max-age=300");
        return new Response(response.body, { status: response.status, headers });
      }
    } catch {
      /* fall through */
    }
    return context.next();
  }

  if (!isGigaSocialPostPath(url.pathname)) {
    return context.next();
  }

  const postId = parsePostId(url.pathname, url.searchParams);
  if (!postId) {
    return context.next();
  }

  const userAgent = context.request.headers.get("User-Agent") || "";
  if (!CRAWLER_UA.test(userAgent)) {
    return context.next();
  }

  const previewUrl = `${convexSite}/gigasocial/post/preview?id=${encodeURIComponent(postId)}`;

  try {
    const response = await fetch(previewUrl, {
      headers: { "User-Agent": userAgent },
    });
    if (response.ok) {
      const html = await response.text();
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      });
    }
  } catch {
    /* fall through */
  }

  return context.next();
}
