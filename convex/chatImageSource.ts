/**
 * Resolve source images for in-chat generation / iterative editing.
 */

import { detectImageEditIntent } from "./mediaCapabilities";
import { isImageCommentaryOrInstruction } from "./imageRequestIntent";

const ASSISTANT_IMAGE_URL_RE =
  /^Here is your (?:generated|edited) image:\s*(https?:\/\/[^\s)]+|data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)\s*$/i;

/** Follow-up edits after a prior generated image (no fresh upload required). */
const ITERATIVE_IMAGE_EDIT_RE =
  /^(?:please\s+)?(?:make it (?:brighter|darker|bigger|smaller|more realistic|blue|red|green|yellow|black|white|purple|orange|pink|gr[ae]y)|change (?:its|the) (?:colou?r|background|lighting|style)|edit (?:it|this)|(?:remove|erase) (?:the |a )?(?:person|people|object|logo|shadow|reflection|blemish)\b|(?:turn|convert) (?:it|this) into (?:an? )?(?:watercolou?r|painting|sketch|cartoon|illustration|line drawing)\b|(?:brighten|darken|upscale|retouch) (?:it|this)|same (?:image|picture|photo) but)\b/i;

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
  if (!q || isImageCommentaryOrInstruction(q)) return false;
  if (detectImageEditIntent(q)) return true;
  if (hasEditableImageSource && ITERATIVE_IMAGE_EDIT_RE.test(q)) return true;
  if (hasEditableImageSource &&
      /\b(?:this|that|same|previous|last|earlier|above)\s+(?:(?:generated|uploaded)\s+)?(?:image|picture|photo|design|poster)\b/i.test(q) &&
      /\b(?:create|make|design|generate|render|use|using|turn|convert|edit|change|remove|retouch)\b/i.test(q)) return true;
  return false;
}

export function resolveChatImageSourceUrl(args: {
  query: string;
  imageAttachments: Array<{ dataUrl?: string }>;
  imageAttachmentsAreHistorical?: boolean;
  history: Array<{ role: string; content: string }>;
}): string | undefined {
  const historicalEdit = isImageEditOrTransformQuery(args.query, true);
  if (args.imageAttachmentsAreHistorical && historicalEdit) {
    const assistantImage = findPriorAssistantImageUrl(args.history);
    if (assistantImage) return assistantImage;
  }
  const mayUseUpload = !args.imageAttachmentsAreHistorical || historicalEdit;
  for (const attachment of mayUseUpload ? args.imageAttachments : []) {
    const dataUrl = attachment.dataUrl?.trim();
    if (dataUrl?.startsWith("data:image/") || /^https?:\/\//i.test(dataUrl ?? "")) {
      return dataUrl;
    }
  }
  // A fresh upload belongs to this request; a historical image requires an
  // explicit edit/reference. A new creative brief must start a new image.
  return isImageEditOrTransformQuery(args.query, true)
    ? findPriorAssistantImageUrl(args.history) ?? undefined
    : undefined;
}

/** Delivery follow-ups ask for the actual asset, rather than advice about it. */
export function isImageDeliveryFollowup(query: string): boolean {
  if (isImageCommentaryOrInstruction(query) && !/^where(?:\s+is|'s)\s+(?:(?:my|the)\s+)?(?:image|poster|picture|flyer|banner)\s*[?!]*$/i.test(query.trim())) return false;
  return /\b(?:waiting for|where is|where's|show me|send me|display|give me the actual|want the actual|want an actual|want a real|still need)\b[\s\S]{0,65}\b(?:poster|flyer|banner|image|picture|design)\b/i.test(query) ||
    /\b(?:poster|flyer|banner|image)\b[\s\S]{0,35}\b(?:not (?:text|code)|instead of (?:text|code))\b/i.test(query);
}

export function resolveChatImagePrompt(query: string, history: Array<{ role: string; content: string }>): string {
  if (!isImageDeliveryFollowup(query)) return query;
  const prior = [...history].reverse().find(turn =>
    turn.role === "user" && turn.content.trim() !== query.trim() &&
    !isImageDeliveryFollowup(turn.content) && !isImageCommentaryOrInstruction(turn.content) &&
    /\b(?:poster|flyer|banner|image|picture|logo)\b/i.test(turn.content)
  );
  if (!prior) return query;
  return prior.content.slice(0, 8000) + "\n\nLatest instructions: " + query;
}
