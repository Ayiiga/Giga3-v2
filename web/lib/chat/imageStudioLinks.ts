/** Deep links into Media Studio for in-chat image workflows (no backend changes). */

export type ImageStudioActionId =
  | "generate"
  | "edit"
  | "remove-bg"
  | "replace-bg"
  | "upscale"
  | "style"
  | "object-remove"
  | "enhance";

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
};

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
];
