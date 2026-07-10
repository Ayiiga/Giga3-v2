/** Cloudflare Pages Function — rich link previews for GigaSocial post shares. */

const CRAWLER_UA =
  /facebookexternalhit|Facebot|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Googlebot|bingbot|Applebot|Pinterest|Embedly|ia_archiver|Snapchat/i;

const DEFAULT_CONVEX_SITE = "https://perfect-lark-521.convex.site";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const id = url.searchParams.get("id")?.trim();
  if (!id) {
    return context.next();
  }

  const userAgent = context.request.headers.get("User-Agent") || "";
  if (!CRAWLER_UA.test(userAgent)) {
    return context.next();
  }

  const convexSite = context.env?.CONVEX_SITE_URL || DEFAULT_CONVEX_SITE;
  const previewUrl = `${convexSite.replace(/\/$/, "")}/gigasocial/post/preview?id=${encodeURIComponent(id)}`;

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
    /* fall through to static shell */
  }

  return context.next();
}
