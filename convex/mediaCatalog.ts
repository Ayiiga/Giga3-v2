export const IMAGE_CATEGORIES = {
  anime_art: {
    label: "Anime Art",
    promptSuffix: "anime art style, vibrant colors, detailed illustration",
  },
  art_3d: {
    label: "3D Art",
    promptSuffix: "3d render, octane render, cinematic lighting, highly detailed",
  },
  historical_scenes: {
    label: "Historical Scenes",
    promptSuffix: "historical scene, period accurate, dramatic composition, photorealistic",
  },
  cinematic_posters: {
    label: "Cinematic Posters",
    promptSuffix: "movie poster style, cinematic, bold typography space, epic composition",
  },
  social_graphics: {
    label: "Social Media Graphics",
    promptSuffix: "social media graphic, clean layout, eye-catching, modern design",
  },
  infographics: {
    label: "Infographics",
    promptSuffix:
      "professional infographic design, clear visual hierarchy, icons, labeled sections, clean typography",
  },
  brochures: {
    label: "Brochures",
    promptSuffix:
      "tri-fold brochure style, information-rich layout, clean sectioning, print-friendly composition",
  },
  flyers: {
    label: "Flyers",
    promptSuffix:
      "promotional flyer design, bold headline, call-to-action area, high contrast print-ready layout",
  },
  business_presentations: {
    label: "Business Presentations",
    promptSuffix:
      "business presentation slide visual, executive style, data-friendly composition, professional branding",
  },
  study_visuals: {
    label: "Study Visualizations",
    promptSuffix:
      "educational study notes visualization, concept map style, labels, learner-friendly visual structure",
  },
  marketing_assets: {
    label: "Marketing Assets",
    promptSuffix:
      "marketing campaign creative, brand-safe composition, conversion-focused layout, modern typography",
  },
  comparison_tables: {
    label: "Comparison Tables",
    promptSuffix:
      "clear comparison table visual, side-by-side columns, readable labels, structured infographic style",
  },
  scientific_illustrations: {
    label: "Scientific Illustrations",
    promptSuffix:
      "scientific illustration, labeled components, educational accuracy, clean diagrammatic style",
  },
  circuit_diagrams: {
    label: "Circuit Diagrams",
    promptSuffix:
      "electrical circuit diagram style, clear component symbols, labeled connections, instructional layout",
  },
  geometry_drawings: {
    label: "Geometry Drawings",
    promptSuffix:
      "geometry drawing style, precise lines, labeled angles and lengths, educational math illustration",
  },
  math_graphs: {
    label: "Mathematical Graphs",
    promptSuffix:
      "mathematical graph visualization, coordinate plane, clean axis labels, function plot styling",
  },
} as const;

export const VIDEO_CATEGORIES = {
  anime_videos: {
    label: "Anime Videos",
    promptSuffix: "anime style motion, smooth animation, vibrant",
  },
  historical_movies: {
    label: "Historical Movies",
    promptSuffix: "historical film scene, cinematic motion, period drama",
  },
  dramatic_scenes: {
    label: "Dramatic Scenes",
    promptSuffix: "dramatic cinematic scene, emotional lighting, film grain",
  },
  cinematic_trailers: {
    label: "Cinematic Trailers",
    promptSuffix: "movie trailer style, epic pacing, dramatic cuts feel",
  },
  social_shorts: {
    label: "Social Media Shorts",
    promptSuffix: "vertical social short, dynamic motion, trendy",
  },
} as const;

export type ImageCategoryId = keyof typeof IMAGE_CATEGORIES;
export type VideoCategoryId = keyof typeof VIDEO_CATEGORIES;


export const FAL_IMAGE_MODEL =
  process.env.FAL_IMAGE_MODEL ?? "fal-ai/nano-banana-pro";

export const REPLICATE_IMAGE_MODEL =
  process.env.REPLICATE_IMAGE_MODEL ?? "black-forest-labs/flux-schnell";

/** Replicate FLUX Kontext — image editing when a source image URL is provided. */
export const REPLICATE_IMAGE_EDIT_MODEL =
  process.env.REPLICATE_IMAGE_EDIT_MODEL?.trim() ||
  "black-forest-labs/flux-kontext-pro";

export function imageCategoryAspectRatio(category: string): SeedanceAspectRatio {
  if (category === "cinematic_posters") return "16:9";
  if (category === "brochures") return "4:3";
  if (category === "flyers") return "3:4";
  if (category === "business_presentations") return "16:9";
  if (category === "comparison_tables") return "16:9";
  if (category === "circuit_diagrams") return "4:3";
  if (category === "geometry_drawings" || category === "math_graphs") return "1:1";
  if (category === "social_graphics") return "1:1";
  return "1:1";
}

export const REPLICATE_VIDEO_MODEL =
  process.env.REPLICATE_VIDEO_MODEL ?? "bytedance/seedance-2.0";

/** Seedance defaults (override via Convex env). */
export const REPLICATE_VIDEO_DURATION = Number(
  process.env.REPLICATE_VIDEO_DURATION ?? 7
);
export const REPLICATE_VIDEO_RESOLUTION =
  process.env.REPLICATE_VIDEO_RESOLUTION?.trim() || "720p";
export const REPLICATE_VIDEO_GENERATE_AUDIO =
  process.env.REPLICATE_VIDEO_GENERATE_AUDIO !== "false";

export type SeedanceAspectRatio = "16:9" | "9:16" | "4:3" | "1:1" | "3:4" | "21:9";

export function videoCategoryAspectRatio(category: string): SeedanceAspectRatio {
  if (category === "social_shorts") return "9:16";
  return "16:9";
}

/** Google AI Studio Imagen — backup text-to-image (GEMINI_API_KEY). */
export const GEMINI_IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL?.trim() || "imagen-4.0-fast-generate-001";

/** Google AI Studio Gemini — backup image editing and native text-to-image fallback. */
export const GEMINI_IMAGE_EDIT_MODEL =
  process.env.GEMINI_IMAGE_EDIT_MODEL?.trim() || "gemini-2.5-flash-image";

export function buildImagePrompt(category: string, userPrompt: string): string {
  const cat =
    IMAGE_CATEGORIES[category as ImageCategoryId] ?? IMAGE_CATEGORIES.anime_art;
  return `${userPrompt.trim()}. ${cat.promptSuffix}`;
}

export function buildVideoPrompt(category: string, userPrompt: string): string {
  const cat =
    VIDEO_CATEGORIES[category as VideoCategoryId] ?? VIDEO_CATEGORIES.anime_videos;
  return `${userPrompt.trim()}. ${cat.promptSuffix}`;
}
