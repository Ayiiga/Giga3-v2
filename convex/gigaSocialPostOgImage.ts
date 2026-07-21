import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  fetchRemoteImageBytes,
  resolveShareThumbnail,
  type OgImageBundle,
} from "./gigaSocialOgImageUtils";

const DEFAULT_OG_IMAGE = "https://www.giga3ai.com/images/logo.png";

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

function imageResponse(bytes: Uint8Array, mime: string, maxAgeSec: number): Response {
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Cache-Control": `public, max-age=${maxAgeSec}`,
    },
  });
}

async function serveDefaultOgImage(): Promise<Response> {
  const fallback = await fetchRemoteImageBytes(DEFAULT_OG_IMAGE);
  if (fallback) {
    return imageResponse(fallback.bytes, fallback.mime, 86400);
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: DEFAULT_OG_IMAGE,
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
    return serveDefaultOgImage();
  }

  const thumbnail = resolveShareThumbnail(bundle);
  if (thumbnail) {
    if (thumbnail.startsWith("data:image/")) {
      const parsed = parseDataUrlImage(thumbnail);
      if (parsed) {
        return imageResponse(parsed.bytes, parsed.mime, 86400);
      }
    } else {
      const remote = await fetchRemoteImageBytes(thumbnail);
      if (remote) {
        return imageResponse(remote.bytes, remote.mime, 86400);
      }
    }
  }

  return serveDefaultOgImage();
});
