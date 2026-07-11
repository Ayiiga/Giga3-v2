import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { parseMediaMetaJson } from "./gigaSocialViews";
import type { PublicSocialPost } from "./gigaSocialViews";

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

function resolveShareThumbnail(bundle: OgImageBundle): string | null {
  const candidates: Array<string | undefined> = [
    bundle.post.videoThumbnailUrl,
    ...parseMediaMetaJson(bundle.mediaMetaJson)
      .filter((item) => item.type === "video")
      .map((item) => item.thumbnailUrl),
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
  if (!thumbnail) {
    return redirectResponse(DEFAULT_OG_IMAGE);
  }

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

  return redirectResponse(DEFAULT_OG_IMAGE);
});
