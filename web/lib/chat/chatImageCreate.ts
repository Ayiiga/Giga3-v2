export type ChatImageAspectRatio = "auto" | "1:1" | "4:5" | "16:9" | "9:16";
export type ChatImageQuality = "standard" | "high";

const ASPECT_HINTS: Record<Exclude<ChatImageAspectRatio, "auto">, string> = {
  "1:1": "square composition",
  "4:5": "portrait 4:5 social format",
  "16:9": "landscape 16:9 widescreen",
  "9:16": "vertical 9:16 mobile story format",
};

/**
 * Builds a natural-language prompt that routes through the existing
 * server-side image_generation pipeline (providerRouter + chatReplyWorker).
 */
export function buildChatImageGenerationMessage(
  prompt: string,
  options?: { aspectRatio?: ChatImageAspectRatio; quality?: ChatImageQuality }
): string {
  const trimmed = prompt.trim();
  const aspect = options?.aspectRatio ?? "auto";
  const quality = options?.quality ?? "standard";

  const parts = [`Create an image of ${trimmed}`];
  if (aspect !== "auto") {
    parts.push(`Use a ${ASPECT_HINTS[aspect]}.`);
  }
  if (quality === "high") {
    parts.push("Use high detail and premium quality.");
  }
  return parts.join(" ");
}
