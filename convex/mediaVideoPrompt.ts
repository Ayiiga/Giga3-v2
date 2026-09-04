/**
 * Video prompt helpers — reduce garbled on-screen text/UI (a common Seedance weakness).
 */

const TEXT_OR_UI_PATTERN =
  /\b(logo|logos|text|title|caption|subtitle|typography|lettering|brand|branding|giga|app\b|ui\b|ux\b|screen|interface|website|slogan|headline|font|readable|spell(?:ed|ing)?|word(?:s)?|letter(?:s)?|nameplate|watermark|banner|poster)\b/i;

const DEVICE_UI_PATTERN =
  /\b(phone|smartphone|mobile app|dashboard|notification|mockup|app store|software|saas|tablet|laptop screen|computer screen)\b/i;

export function videoPromptNeedsTextGuard(userPrompt: string): boolean {
  const p = userPrompt.trim();
  if (!p) return false;
  if (TEXT_OR_UI_PATTERN.test(p) || DEVICE_UI_PATTERN.test(p)) return true;
  // Quoted phrases usually mean the model should render specific words.
  return /"[^"]{2,}"/.test(p) || /'[^']{2,}'/.test(p);
}

export function motionOnlyVideoPromptFromImage(userPrompt: string): string {
  const trimmed = userPrompt.trim();
  return `Subtle cinematic motion only: gentle camera push-in or slow parallax. Preserve every English letter, logo, and UI element exactly as in the source frame — no new text, no warping, no invented characters, no foreign symbols. ${trimmed}`;
}

export type VideoPromptImageMode = "none" | "user" | "generated";

/**
 * Build the final video prompt for text-only, user image + prompt, or auto-generated frame + prompt.
 * The text prompt always drives motion/story; an image (when present) anchors the first frame.
 */
export function buildVideoPromptWithOptionalImage(
  builtPrompt: string,
  userPrompt: string,
  imageMode: VideoPromptImageMode = "none"
): string {
  const core = builtPrompt.trim() || userPrompt.trim();

  if (imageMode === "none") {
    return refineVideoPromptForGeneration(core, false);
  }

  const scene = core || userPrompt.trim() || "Smooth cinematic motion.";
  const withImage =
    imageMode === "generated"
      ? `${scene}. Animate from the generated opening frame using the scene description above for camera movement, pacing, and mood. Preserve every English letter, logo, and UI element in the frame — no warping or invented text.`
      : `${scene}. Use the provided source image as the first frame and follow the prompt above for motion, pacing, camera work, and story while keeping the composition stable.`;

  return refineVideoPromptForGeneration(withImage, true);
}

/** Steer generation away from unreadable on-screen text unless a source image anchors it. */
export function refineVideoPromptForGeneration(
  userPrompt: string,
  hasSourceImage: boolean
): string {
  const trimmed = userPrompt.trim();
  if (!trimmed) return trimmed;
  if (!videoPromptNeedsTextGuard(trimmed)) return trimmed;

  if (hasSourceImage) {
    return `${trimmed}. Animate with smooth natural motion while preserving the source image composition. Keep all English text and UI perfectly stable — do not warp letters, change spelling, or invent non-English symbols.`;
  }

  return `${trimmed}. Cinematic scene with natural motion and lighting. Do not generate readable text, logos, or detailed app UI on screens — show devices with blurred screens, soft bokeh, or abstract light instead. Focus on people, environment, and camera movement.`;
}

export function defaultVideoNegativePrompt(
  userPrompt: string,
  userNegative?: string
): string | undefined {
  const parts: string[] = [];
  if (userNegative?.trim()) parts.push(userNegative.trim());
  if (videoPromptNeedsTextGuard(userPrompt)) {
    parts.push(
      "garbled text, illegible letters, misspelled words, distorted typography, fake UI, gibberish characters, warped logos, unreadable screen content, glitched interface, melted faces on screens, non-english characters, cyrillic text, greek letters, arabic script, hieroglyphs, alien symbols, mirrored letters, nonsense typography"
    );
  }
  return parts.length > 0 ? parts.join(", ") : undefined;
}
