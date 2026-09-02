/** Persist generated image bytes in Convex file storage (e.g. Google AI Studio data URLs). */

import type { ActionCtx } from "./_generated/server";

/** Provider CDN links expire; copy videos into Convex storage when they are reasonably small. */
const MAX_PERSISTED_VIDEO_BYTES = 60 * 1024 * 1024;
const VIDEO_FETCH_TIMEOUT_MS = 90_000;

export async function persistVideoUrlIfPossible(
  ctx: ActionCtx,
  videoUrl: string,
  contentType?: string
): Promise<string> {
  if (!/^https?:\/\//i.test(videoUrl)) return videoUrl;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VIDEO_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(videoUrl, { signal: controller.signal });
    if (!res.ok) return videoUrl;
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_PERSISTED_VIDEO_BYTES) return videoUrl;
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_PERSISTED_VIDEO_BYTES) return videoUrl;
    const type = contentType || res.headers.get("content-type") || "video/mp4";
    const storageId = await ctx.storage.store(new Blob([buffer], { type }));
    const stored = await ctx.storage.getUrl(storageId);
    return stored ?? videoUrl;
  } catch (err) {
    console.warn("[mediaStorage] keeping provider URL, persist failed:", err);
    return videoUrl;
  } finally {
    clearTimeout(timer);
  }
}

export async function persistImageUrlIfNeeded(
  ctx: ActionCtx,
  imageUrl: string
): Promise<string> {
  if (!imageUrl.startsWith("data:")) {
    return imageUrl;
  }

  const match = /^data:([^;]+);base64,(.+)$/.exec(imageUrl);
  if (!match) {
    return imageUrl;
  }

  const mimeType = match[1];
  const bytes = Buffer.from(match[2], "base64");
  const blob = new Blob([bytes], { type: mimeType });
  const storageId = await ctx.storage.store(blob);
  const url = await ctx.storage.getUrl(storageId);
  if (!url) {
    throw new Error("Failed to store generated image");
  }
  return url;
}
