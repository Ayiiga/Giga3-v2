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

export function chatImageReferenceKind(query: string): "uploaded" | "generated" | "latest" | null {
  if (isImageCommentaryOrInstruction(query)) return null;
  if (!/\b(?:create|make|design|generate|render|use|using|turn|convert|edit|change|remove|retouch|replace|add|enhance|brighten|darken|crop|resize|rotate|upscale)\b/i.test(query)) return null;
  if (/\b(?:uploaded|attached)\s+(?:image|picture|photo|photograph|portrait|design|poster|logo)\b|\b(?:the|this|that|my|our|previous|last|earlier)\s+(?:original|source)\s+(?:image|picture|photo|photograph|portrait|design|poster|logo)\b|\b(?:use|using|with|from|of|based on|edit|enhance|retouch|brighten|darken|crop|resize|rotate|upscale|change)\s+(?:my|our)\s+(?:photo|photograph|picture|portrait)\b|\b(?:image|picture|photo|photograph)\s+(?:(?:that|which)\s+)?(?:I|we)\s+(?:uploaded|attached|provided)\b/i.test(query)) return "uploaded";
  if (/\b(?:the|this|that|same|previous|last|earlier|above)\s+(?:(?:previous|last|earlier|newly|AI)\s+)?(?:generated|rendered|created)\s+(?:image|picture|photo|design|poster|logo)\b/i.test(query)) return "generated";
  if (/\b(?:this|that|same|previous|last|earlier|above)\s+(?:image|picture|photo|design|poster|logo)\b/i.test(query)) return "latest";
  return null;
}

export function missingChatImageReferenceMessage(query: string, sourceUrl?: string): string | undefined {
  const reference = chatImageReferenceKind(query);
  if (sourceUrl || reference === null) return undefined;
  return reference === "uploaded"
    ? "Please attach the original photo again so I can use it in your design. No image credits were charged."
    : reference === "generated"
      ? "Please attach the generated image you want to use. No image credits were charged."
      : "Please attach the image you want to use. No image credits were charged.";
}

export function isImageEditOrTransformQuery(
  query: string,
  hasEditableImageSource: boolean
): boolean {
  const q = query.trim();
  if (!q || isImageCommentaryOrInstruction(q)) return false;
  if (detectImageEditIntent(q)) return true;
  if (hasEditableImageSource && ITERATIVE_IMAGE_EDIT_RE.test(q)) return true;
  if (hasEditableImageSource && chatImageReferenceKind(q)) return true;
  return false;
}

/** A retry may rehydrate the upload attached to the same original user turn. */
export function isChatImageUploadForMessage(args: {
  storedAt?: number;
  messageCreatedAt?: number;
  now?: number;
}): boolean {
  const now = args.now ?? Date.now();
  return typeof args.storedAt === "number" && Number.isFinite(args.storedAt) &&
    args.messageCreatedAt === args.storedAt && now >= args.storedAt &&
    now - args.storedAt <= 45 * 60 * 1000;
}

export function resolveChatImageSourceUrl(args: {
  query: string;
  imageAttachments: Array<{ dataUrl?: string }>;
  imageAttachmentsAreHistorical?: boolean;
  history: Array<{ role: string; content: string }>;
}): string | undefined {
  const historicalEdit = isImageEditOrTransformQuery(args.query, true);
  const reference = chatImageReferenceKind(args.query);
  const upload = args.imageAttachments.map(attachment => attachment.dataUrl?.trim())
    .find(url => url?.startsWith("data:image/") || /^https?:\/\//i.test(url ?? ""));
  const generated = historicalEdit ? findPriorAssistantImageUrl(args.history) ?? undefined : undefined;
  const explicitlyEarlier = /\b(?:previous|last|earlier|above)\s+(?:(?:uploaded|attached|generated|rendered|created|original|source)\s+)?(?:image|picture|photo|photograph|portrait|design|poster|logo)\b/i.test(args.query);
  // The in-chat edit dialog explicitly attaches the selected image as its source.
  if (!args.imageAttachmentsAreHistorical && upload && /^Edit this image:/i.test(args.query)) return upload;
  // Current attachments supply “this image”, regardless of how it was made.
  // An explicit earlier reference must not silently consume a new attachment.
  if (!args.imageAttachmentsAreHistorical && upload && !explicitlyEarlier) return upload;
  const historicalUpload = args.imageAttachmentsAreHistorical ? upload : undefined;
  if (reference === "uploaded") return historicalUpload;
  if (reference === "generated") return generated;
  return historicalEdit ? generated ?? historicalUpload : undefined;
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
