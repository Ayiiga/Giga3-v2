/** Lets the generate form refresh recent jobs without polling in the same React tree. */
export const mediaJobsRefreshRef: { current: (() => void) | null } = {
  current: null,
};

export function triggerMediaJobsRefresh(): void {
  void mediaJobsRefreshRef.current?.();
}

/**
 * Tiny external store of the user's recent successful image URLs, published by
 * the recent-generations list and read by the video form ("start from an
 * image") — keeps the form free of any job-list subscription.
 */
let recentImageUrls: string[] = [];
const listeners = new Set<() => void>();

export function publishRecentImageUrls(urls: string[]): void {
  const next = urls.slice(0, 12);
  if (next.length === recentImageUrls.length && next.every((u, i) => u === recentImageUrls[i])) {
    return;
  }
  recentImageUrls = next;
  for (const listener of listeners) listener();
}

export function subscribeRecentImageUrls(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRecentImageUrls(): string[] {
  return recentImageUrls;
}
