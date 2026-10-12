/**
 * Resolve source images for in-chat generation / iterative editing.
 */

import { detectImageEditIntent } from "./mediaCapabilities";

const ASSISTANT_IMAGE_URL_RE =
  /(?:Here is your generated image:\s*)?(https?:\/\/[^\s)]+|data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)/i;

/** Follow-up edits after a prior generated image (no fresh upload required). */
const ITERATIVE_IMAGE_EDIT_RE =
  /\b(make (it|the|this)|change (it|the|this)|turn (it|the|this)|edit (it|this)|add|remove|replace|brighter|darker|more|less|bigger|smaller|different (color|background|style)|same (image|picture|photo) but|background|enhance|upscale|retouch)\b/i;

export function extractImageUrlFromContent(content: string): string | null {
  const match = content.match(ASSISTANT_IMAGE_URL_RE);
  const url = match?.[1]?.trim();
  if (!url) return null;
  if (url.startsWith("data:image/") || /^https?:\/\//i.test(url)) return url;
  return null;
}

export function findPriorAssistantImageUrl(
  messages: Array<{ role: string; content: string }>
): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const turn = messages[i];
    if (turn.role !== "assistant") continue;
    const url = extractImageUrlFromContent(turn.content);
    if (url) return url;
  }
  return null;
}

export function isImageEditOrTransformQuery(
  query: string,
  hasEditableImageSource: boolean
): boolean {
  const q = query.trim();
  if (!q) return false;
  if (detectImageEditIntent(q)) return true;
  if (hasEditableImageSource && ITERATIVE_IMAGE_EDIT_RE.test(q)) return true;
  if (hasEditableImageSource && /\bedit\b/i.test(q)) return true;
  return false;
}

export function resolveChatImageSourceUrl(args: {
  imageAttachments: Array<{ dataUrl?: string }>;
  history: Array<{ role: string; content: string }>;
}): string | undefined {
  for (const attachment of args.imageAttachments) {
    const dataUrl = attachment.dataUrl?.trim();
    if (dataUrl?.startsWith("data:image/") || /^https?:\/\//i.test(dataUrl ?? "")) {
      return dataUrl;
    }
  }
  return findPriorAssistantImageUrl(args.history) ?? undefined;
}
