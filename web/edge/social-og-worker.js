/** Cloudflare Pages Advanced Mode worker — rich OG previews for shared GigaSocial posts. */

const CRAWLER_UA =
  /facebookexternalhit|Facebot|WhatsApp|whatsapp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Googlebot|bingbot|Applebot|Pinterest|Embedly|ia_archiver|Snapchat|SkypeUriPreview/i;

const DEFAULT_CONVEX_SITE = "https://perfect-lark-521.convex.site";

function isGigaSocialPostPath(pathname) {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return normalized === "/gigasocial/post";
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!isGigaSocialPostPath(url.pathname)) {
      return env.ASSETS.fetch(request);
    }

    const postId = url.searchParams.get("id")?.trim();
    if (!postId) {
      return env.ASSETS.fetch(request);
    }

    const userAgent = request.headers.get("User-Agent") || "";
    if (!CRAWLER_UA.test(userAgent)) {
      return env.ASSETS.fetch(request);
    }

    const convexSite = (env.CONVEX_SITE_URL || DEFAULT_CONVEX_SITE).replace(/\/$/, "");
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
      /* fall through to static shell */
    }

    return env.ASSETS.fetch(request);
  },
};
