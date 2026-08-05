/** Deep links into Media Studio for in-chat / GigaEdit image workflows (no backend changes). */

export type ImageStudioActionId =
  | "generate"
  | "edit"
  | "remove-bg"
  | "replace-bg"
  | "upscale"
  | "style"
  | "object-remove"
  | "enhance"
  | "face-enhance"
  | "skin-retouch"
  | "portrait-light"
  | "color-correct"
  | "relight"
  | "blur-bg"
  | "denoise"
  | "restore"
  | "thumbnail"
  | "poster"
  | "logo";

const ACTION_PROMPTS: Record<ImageStudioActionId, string> = {
  generate:
    "A high-quality creative image with rich detail, professional lighting, and a polished composition.",
  edit: "Edit this image based on the user's instructions while preserving the main subject.",
  "remove-bg": "Remove the background cleanly and output a transparent or white backdrop product shot.",
  "replace-bg":
    "Replace the background with a professional studio scene while keeping the subject sharp.",
  upscale: "Upscale and enhance image sharpness, detail, and clarity without artifacts.",
  style: "Apply an artistic style transfer while keeping the composition recognizable.",
  "object-remove": "Remove the selected object and inpaint the background naturally.",
  enhance: "Enhance lighting, color balance, and overall image quality for a premium look.",
  "face-enhance":
    "Subtly enhance facial clarity, eyes, and natural skin detail while keeping identity unchanged.",
  "skin-retouch":
    "Retouch skin smoothly and naturally — reduce blemishes without plastic or over-smoothed look.",
  "portrait-light":
    "Relight as a flattering portrait with soft key light, gentle fill, and clean catchlights.",
  "color-correct":
    "Correct white balance, contrast, and color grading for a natural premium finish.",
  relight:
    "Relight the scene with cinematic, even illumination while preserving subject shape and texture.",
  "blur-bg":
    "Keep the subject sharp and apply a natural shallow depth-of-field blur to the background.",
  denoise:
    "Remove noise and grain from a low-light photo while preserving real detail and edges.",
  restore:
    "Restore an old or damaged photo — repair scratches, fade, and color while staying faithful.",
  thumbnail:
    "Create a bold, high-contrast social thumbnail with clear subject focus and readable energy.",
  poster:
    "Design a clean promotional poster composition with strong hierarchy and African-modern flair.",
  logo: "Generate a simple, memorable logo mark concept with clean shapes and strong silhouette.",
};

const ACTION_IDS: ImageStudioActionId[] = [
  "generate",
  "edit",
  "remove-bg",
  "replace-bg",
  "upscale",
  "style",
  "object-remove",
  "enhance",
  "face-enhance",
  "skin-retouch",
  "portrait-light",
  "color-correct",
  "relight",
  "blur-bg",
  "denoise",
  "restore",
  "thumbnail",
  "poster",
  "logo",
];

const SOURCE_OPTIONAL = new Set<ImageStudioActionId>([
  "generate",
  "thumbnail",
  "poster",
  "logo",
]);

export function parseImageStudioActionId(
  value: string | null | undefined
): ImageStudioActionId | null {
  if (!value) return null;
  return ACTION_IDS.includes(value as ImageStudioActionId)
    ? (value as ImageStudioActionId)
    : null;
}

export function getImageStudioActionPrompt(action: ImageStudioActionId): string {
  return ACTION_PROMPTS[action];
}

export function imageStudioActionRequiresSource(action: ImageStudioActionId): boolean {
  return !SOURCE_OPTIONAL.has(action);
}

export function buildImageStudioActionUrl(
  action: ImageStudioActionId,
  sourceUrl?: string
): string {
  const params = new URLSearchParams({
    tab: "image",
    category: "anime_art",
    template: "ai-images",
    prompt: ACTION_PROMPTS[action],
    action,
  });
  if (sourceUrl?.trim()) {
    params.set("source", sourceUrl.trim());
  }
  return `/media?${params.toString()}`;
}

export const IMAGE_STUDIO_QUICK_ACTIONS: {
  id: ImageStudioActionId;
  label: string;
  shortLabel: string;
}[] = [
  { id: "generate", label: "Generate image", shortLabel: "Generate" },
  { id: "edit", label: "Edit with prompt", shortLabel: "Edit" },
  { id: "remove-bg", label: "Remove background", shortLabel: "Remove BG" },
  { id: "replace-bg", label: "Replace background", shortLabel: "New BG" },
  { id: "upscale", label: "Upscale image", shortLabel: "Upscale" },
  { id: "style", label: "Style transfer", shortLabel: "Style" },
  { id: "object-remove", label: "Remove object", shortLabel: "Erase" },
  { id: "enhance", label: "Enhance quality", shortLabel: "Enhance" },
  { id: "face-enhance", label: "Face enhancement", shortLabel: "Face" },
  { id: "skin-retouch", label: "Skin retouch", shortLabel: "Retouch" },
  { id: "portrait-light", label: "Portrait lighting", shortLabel: "Light" },
  { id: "restore", label: "Restore photo", shortLabel: "Restore" },
  { id: "thumbnail", label: "AI thumbnail", shortLabel: "Thumb" },
  { id: "poster", label: "AI poster", shortLabel: "Poster" },
  { id: "logo", label: "AI logo", shortLabel: "Logo" },
];
