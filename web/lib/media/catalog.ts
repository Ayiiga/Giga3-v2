export const IMAGE_CATEGORIES = [
  {
    id: "anime_art",
    label: "Anime Art",
    description: "Vibrant anime illustrations",
    promptSuffix: "anime art style, vibrant colors, detailed illustration",
  },
  {
    id: "art_3d",
    label: "3D Art",
    description: "Rendered 3D visuals",
    promptSuffix: "3d render, octane render, cinematic lighting, highly detailed",
  },
  {
    id: "historical_scenes",
    label: "Historical Scenes",
    description: "Period-accurate scenes",
    promptSuffix: "historical scene, period accurate, dramatic composition, photorealistic",
  },
  {
    id: "cinematic_posters",
    label: "Cinematic Posters",
    description: "Epic poster compositions",
    promptSuffix: "movie poster style, cinematic, bold typography space, epic composition",
  },
  {
    id: "social_graphics",
    label: "Social Media Graphics",
    description: "Feed-ready creatives",
    promptSuffix: "social media graphic, clean layout, eye-catching, modern design",
  },
] as const;

export const VIDEO_CATEGORIES = [
  {
    id: "anime_videos",
    label: "Anime Videos",
    description: "Anime-style motion",
    promptSuffix: "anime style motion, smooth animation, vibrant",
  },
  {
    id: "historical_movies",
    label: "Historical Movies",
    description: "Period film scenes",
    promptSuffix: "historical film scene, cinematic motion, period drama",
  },
  {
    id: "dramatic_scenes",
    label: "Dramatic Scenes",
    description: "High-drama clips",
    promptSuffix: "dramatic cinematic scene, emotional lighting, film grain",
  },
  {
    id: "cinematic_trailers",
    label: "Cinematic Trailers",
    description: "Trailer-style cuts",
    promptSuffix: "movie trailer style, epic pacing, dramatic cuts feel",
  },
  {
    id: "social_shorts",
    label: "Social Media Shorts",
    description: "Vertical short-form",
    promptSuffix: "vertical social short, dynamic motion, trendy",
  },
] as const;

export type ImageCategoryId = (typeof IMAGE_CATEGORIES)[number]["id"];
export type VideoCategoryId = (typeof VIDEO_CATEGORIES)[number]["id"];

export function buildImagePrompt(category: ImageCategoryId, userPrompt: string): string {
  const cat = IMAGE_CATEGORIES.find((c) => c.id === category) ?? IMAGE_CATEGORIES[0];
  return `${userPrompt.trim()}. ${cat.promptSuffix}`;
}

export function buildVideoPrompt(category: VideoCategoryId, userPrompt: string): string {
  const cat = VIDEO_CATEGORIES.find((c) => c.id === category) ?? VIDEO_CATEGORIES[0];
  return `${userPrompt.trim()}. ${cat.promptSuffix}`;
}

/** Map Convex / provider errors to user-friendly copy. */
export function friendlyMediaError(raw: unknown): string {
  const msg = raw instanceof Error ? raw.message : String(raw ?? "Generation failed");
  if (/Could not find public function/i.test(msg)) {
    return "Media service is temporarily unavailable. Please try again later.";
  }
  if (/Insufficient tokens/i.test(msg)) {
    return "Not enough tokens for this generation. Top up credits or try a smaller request.";
  }
  if (/User not found/i.test(msg)) {
    return "Sign in again to continue generating media.";
  }
  if (/fal submit failed|Application .* not found|REPLICATE|API key|401|403|404/i.test(msg)) {
    return "The image/video provider is not configured or unavailable. Try again later or contact support.";
  }
  return msg.length > 200 ? `${msg.slice(0, 200)}…` : msg;
}
