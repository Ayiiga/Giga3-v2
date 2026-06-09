/** Persist generated image bytes in Convex file storage (e.g. Google AI Studio data URLs). */

import type { ActionCtx } from "./_generated/server";

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
