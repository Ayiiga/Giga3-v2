import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { parseMediaMetaJson } from "./gigaSocialViews";
import type { PublicSocialPost } from "./gigaSocialViews";
import { splitPostDisplay } from "./gigaSocialOg";

const DEFAULT_OG_IMAGE = "https://www.giga3ai.com/images/logo.png";

type OgImageBundle = {
  post: PublicSocialPost;
  mediaMetaJson?: string | null;
};

function isPublicImageUrl(url: string): boolean {
  const trimmed = url.trim();
  return trimmed.startsWith("https://") || trimmed.startsWith("http://");
}

function parseDataUrlImage(dataUrl: string): { bytes: Uint8Array; mime: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-z0-9+.-]+);base64,(.+)$/i);
  if (!match) return null;
  try {
    const binary = atob(match[2].replace(/\s/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { bytes, mime: match[1].toLowerCase() };
  } catch {
    return null;
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.slice(0, maxLines);
}

function buildTextPreviewSvg(post: PublicSocialPost): string {
  const display = splitPostDisplay(post.body);
  const headline = (display.title || display.description || post.body).slice(0, 120);
  const lines = wrapText(headline, 28, 4);
  const author = post.author.displayName.slice(0, 40);
  const lineElements = lines
    .map(
      (line, index) =>
        `<text x="60" y="${200 + index * 52}" font-family="system-ui, -apple-system, sans-serif" font-size="36" font-weight="600" fill="#ffffff">${escapeXml(line)}</text>`
    )
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="100%" style="stop-color:#1e40af"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <text x="60" y="80" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="700" fill="#93c5fd">GigaSocial</text>
  ${lineElements}
  <text x="60" y="560" font-family="system-ui, -apple-system, sans-serif" font-size="24" fill="#cbd5e1">by ${escapeXml(author)}</text>
</svg>`;
}

function resolveShareThumbnail(bundle: OgImageBundle): string | null {
  const mediaItems = parseMediaMetaJson(bundle.mediaMetaJson);
  const candidates: Array<string | undefined> = [
    bundle.post.videoThumbnailUrl,
    ...mediaItems
      .filter((item) => item.type === "video")
      .map((item) => item.thumbnailUrl),
    ...mediaItems
      .filter((item) => item.type === "image")
      .map((item) => item.url),
    bundle.post.mediaUrls?.[0],
    bundle.post.mediaUrl,
  ];

  for (const candidate of candidates) {
    if (!candidate?.trim()) continue;
    const value = candidate.trim();
    if (isPublicImageUrl(value) || value.startsWith("data:image/")) {
      return value;
    }
  }

  return null;
}

function redirectResponse(target: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: target,
      "Cache-Control": "public, max-age=300",
    },
  });
}

export const gigaSocialPostOgImage = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const postId = url.searchParams.get("id")?.trim();
  if (!postId) {
    return new Response("Missing id query parameter", { status: 400 });
  }

  let bundle: OgImageBundle | null = null;
  try {
    bundle = await ctx.runQuery(internal.gigaSocial.getPublicPostOgBundle, {
      postId: postId as Id<"socialPosts">,
    });
  } catch {
    bundle = null;
  }

  if (!bundle) {
    return redirectResponse(DEFAULT_OG_IMAGE);
  }

  const thumbnail = resolveShareThumbnail(bundle);
  if (thumbnail) {
    if (isPublicImageUrl(thumbnail)) {
      return redirectResponse(thumbnail);
    }

    const parsed = parseDataUrlImage(thumbnail);
    if (parsed) {
      return new Response(parsed.bytes, {
        status: 200,
        headers: {
          "Content-Type": parsed.mime,
          "Cache-Control": "public, max-age=86400",
        },
      });
    }
  }

  if (bundle.post.body.trim()) {
    const svg = buildTextPreviewSvg(bundle.post);
    return new Response(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  return redirectResponse(DEFAULT_OG_IMAGE);
});
