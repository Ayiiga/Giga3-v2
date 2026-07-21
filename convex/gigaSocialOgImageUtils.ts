import { parseMediaMetaJson } from "./gigaSocialViews";
import type { PublicSocialPost } from "./gigaSocialViews";

export type OgImageBundle = {
  post: PublicSocialPost;
  mediaMetaJson?: string | null;
};

const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m4v|avi|mkv)(\?|#|$)/i;

export function isPublicHttpUrl(url: string): boolean {
  const trimmed = url.trim();
  return trimmed.startsWith("https://") || trimmed.startsWith("http://");
}

/** True when URL is likely a raster image crawlers can use for og:image. */
export function isLikelyImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!isPublicHttpUrl(trimmed)) return false;
  if (VIDEO_EXTENSIONS.test(trimmed)) return false;

  const withoutQuery = trimmed.split(/[?#]/)[0] ?? trimmed;
  if (/\.(jpe?g|png|gif|webp|avif|bmp|svg)(\?|#|$)/i.test(withoutQuery)) {
    return true;
  }

  // Supabase / Convex storage URLs often omit extensions — allow if not a video path.
  if (/\/video\//i.test(trimmed)) return false;
  return true;
}

export function resolveShareThumbnail(bundle: OgImageBundle): string | null {
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
    if (value.startsWith("data:image/")) return value;
    if (isLikelyImageUrl(value)) return value;
  }

  return null;
}

export async function fetchRemoteImageBytes(
  url: string
): Promise<{ bytes: Uint8Array; mime: string } | null> {
  try {
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok) return null;

    const contentType = (response.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!contentType.startsWith("image/")) return null;

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length === 0) return null;

    return { bytes, mime: contentType };
  } catch {
    return null;
  }
}
