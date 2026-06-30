export const VIDEO_AI_CATEGORIES = {
  text_to_video: {
    label: "Text to Video",
    promptSuffix: "cinematic motion, smooth camera movement, high quality video",
    mode: "text_to_video",
  },
  image_to_video: {
    label: "Image to Video",
    promptSuffix: "animate the scene with natural motion, preserve subject identity",
    mode: "image_to_video",
  },
  talking_avatar: {
    label: "Talking Avatar",
    promptSuffix: "talking head presenter, lip sync friendly, professional studio lighting",
    mode: "talking_avatar",
  },
  educational: {
    label: "Educational Video",
    promptSuffix: "educational explainer video, clear visuals, learner-friendly pacing",
    mode: "educational",
  },
  product_ad: {
    label: "Product Advertisement",
    promptSuffix: "product showcase ad, premium lighting, conversion-focused composition",
    mode: "product_ad",
  },
  promotional: {
    label: "Promotional Video",
    promptSuffix: "promotional campaign video, bold branding, energetic pacing",
    mode: "promotional",
  },
  social_reel: {
    label: "Social Media Reel",
    promptSuffix: "vertical social media reel, punchy hook, mobile-first framing",
    mode: "social_reel",
  },
  presentation: {
    label: "Presentation",
    promptSuffix: "business presentation motion graphics, clean slides, executive style",
    mode: "presentation",
  },
  cinematic: {
    label: "Cinematic Storytelling",
    promptSuffix: "cinematic film sequence, dramatic lighting, narrative arc",
    mode: "cinematic",
  },
} as const;

export type VideoAiCategoryId = keyof typeof VIDEO_AI_CATEGORIES;

export function buildVideoAiPrompt(category: string, userPrompt: string): string {
  const key = category in VIDEO_AI_CATEGORIES ? (category as VideoAiCategoryId) : "text_to_video";
  const def = VIDEO_AI_CATEGORIES[key];
  const trimmed = userPrompt.trim();
  if (!trimmed) return def.promptSuffix;
  return `${trimmed}. Style: ${def.promptSuffix}`;
}

export function videoAiAspectRatio(category: string): "16:9" | "9:16" | "1:1" {
  if (category === "social_reel") return "9:16";
  if (category === "presentation") return "16:9";
  return "16:9";
}
