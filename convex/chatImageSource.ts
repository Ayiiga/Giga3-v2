/**
 * Resolve source images for in-chat generation / iterative editing.
 */

import { detectImageEditIntent } from "./mediaCapabilities";

const ASSISTANT_IMAGE_URL_RE =
  /^Here is your (?:generated|edited) image:\s*(https?:\/\/[^\s)]+|data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)\s*$/i;

/** Follow-up edits after a prior generated image (no fresh upload required). */
const ITERATIVE_IMAGE_EDIT_RE =
  /^(?:please\s+)?(?:make it (?:brighter|darker|bigger|smaller|more realistic)|change (?:its|the) (?:colou?r|background|lighting|style)|edit (?:it|this)|(?:brighten|darken|upscale|retouch) (?:it|this)|same (?:image|picture|photo) but)\b/i;

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
    return extractImageUrlFromContent(turn.content);
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
