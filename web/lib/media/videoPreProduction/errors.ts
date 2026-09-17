/** User-facing copy for pre-production workflow failures — never raw provider errors. */

export const PREPROD_SCRIPT_FAILED =
  "Script generation failed. Please try again.";

export const PREPROD_REWRITE_FAILED =
  "Rewrite failed. Your script has been saved. Please try again.";

export const PREPROD_VOICEOVER_FAILED =
  "Voiceover preview failed. Your script has been saved. Try again.";

export const PREPROD_VIDEO_FAILED =
  "Video generation failed. Your script and voiceover are safe. Try generating the video again.";

export const PREPROD_IMAGE_UPLOAD_FAILED =
  "Could not upload image. Try again or continue without images.";

const PROVIDER_PATTERNS = [
  /rate limit/i,
  /timeout/i,
  /ECONNRESET/i,
  /502|503|504/,
  /fal\.ai/i,
  /replicate/i,
  /openai/i,
  /api[_-]?key/i,
];

/** Map thrown/returned errors to safe UI copy when appropriate. */
export function toPreProdUserError(
  err: unknown,
  fallback: string
): string {
  if (!(err instanceof Error)) return fallback;
  const msg = err.message.trim();
  if (!msg) return fallback;
  if (msg.includes("Insufficient credits")) return msg;
  if (msg.includes("Sign in")) return msg;
  if (PROVIDER_PATTERNS.some((re) => re.test(msg))) return fallback;
  if (msg.length > 160) return fallback;
  return msg;
}
