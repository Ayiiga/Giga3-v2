/** Cloudflare Pages middleware — rich OG previews for shared GigaSocial posts. */

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

export async function onRequest(context) {
  const url = new URL(context.request.url);
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
