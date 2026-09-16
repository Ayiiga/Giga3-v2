import type { PreProductionScene } from "@/lib/media/videoPreProduction/types";

export const MAX_OPTIONAL_REFERENCE_IMAGES = 6;

export function isHttpsImageUrl(url: string): boolean {
  return /^https?:\/\/\S+/i.test(url.trim());
}

/** First public image URL usable as a video first-frame / reference. */
export function pickSourceImageUrl(urls: string[]): string | undefined {
  return urls.find((url) => isHttpsImageUrl(url));
}

/** Per-scene image when multiple references are supplied; falls back to shared image. */
export function resolveSceneSourceImage(
  scene: PreProductionScene,
  imageUrls: string[]
): string | undefined {
  if (scene.optionalImageUrl && isHttpsImageUrl(scene.optionalImageUrl)) {
    return scene.optionalImageUrl;
  }
  const index = Math.max(0, scene.sceneNumber - 1);
  const fromList = imageUrls[index];
  if (fromList && isHttpsImageUrl(fromList)) return fromList;
  return pickSourceImageUrl(imageUrls);
}

/** Map optional gallery images onto scenes (round-robin when fewer images than scenes). */
export function assignSceneImages(
  scenes: PreProductionScene[],
  imageUrls: string[]
): PreProductionScene[] {
  const usable = imageUrls.filter(isHttpsImageUrl);
  if (!usable.length) {
    return scenes.map((scene) => ({ ...scene, optionalImageUrl: undefined }));
  }
  return scenes.map((scene, index) => ({
    ...scene,
    optionalImageUrl: usable[index % usable.length],
  }));
}

export function addOptionalImageUrl(
  current: string[],
  url: string,
  max = MAX_OPTIONAL_REFERENCE_IMAGES
): string[] {
  const trimmed = url.trim();
  if (!trimmed || current.includes(trimmed)) return current;
  return [...current, trimmed].slice(0, max);
}

export function removeOptionalImageUrl(current: string[], index: number): string[] {
  return current.filter((_, i) => i !== index);
}

export function replaceOptionalImageUrl(
  current: string[],
  index: number,
  nextUrl: string
): string[] {
  const trimmed = nextUrl.trim();
  if (!trimmed) return current;
  return current.map((url, i) => (i === index ? trimmed : url));
}
