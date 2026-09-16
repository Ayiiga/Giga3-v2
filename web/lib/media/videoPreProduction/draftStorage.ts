import {
  createEmptyDraft,
  type VideoPreProductionDraft,
} from "@/lib/media/videoPreProduction/types";

const STORAGE_KEY = "giga3_media_video_preprod_draft";

export function loadPreProductionDraft(): VideoPreProductionDraft {
  if (typeof window === "undefined") return createEmptyDraft();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyDraft();
    const parsed = JSON.parse(raw) as VideoPreProductionDraft;
    if (parsed.version !== 1) return createEmptyDraft();
    return { ...createEmptyDraft(), ...parsed };
  } catch {
    return createEmptyDraft();
  }
}

export function savePreProductionDraft(draft: VideoPreProductionDraft): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...draft, updatedAt: Date.now() })
    );
  } catch {
    /* quota or private mode */
  }
}

export function clearPreProductionDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
