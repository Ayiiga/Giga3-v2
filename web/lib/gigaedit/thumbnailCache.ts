/**
 * In-memory thumbnail cache for recent projects grid.
 * Avoids re-decoding data URLs on every render.
 */

const cache = new Map<string, string>();

export function getCachedThumbnail(projectId: string): string | undefined {
  return cache.get(projectId);
}

export function setCachedThumbnail(projectId: string, dataUrl: string): void {
  if (!dataUrl) return;
  cache.set(projectId, dataUrl);
}

export function primeThumbnailCache(
  projects: Array<{ id: string; thumbnailDataUrl?: string }>
): void {
  for (const project of projects) {
    if (project.thumbnailDataUrl) {
      setCachedThumbnail(project.id, project.thumbnailDataUrl);
    }
  }
}

export function clearThumbnailCache(): void {
  cache.clear();
}
