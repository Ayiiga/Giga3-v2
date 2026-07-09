import { GIGA3_APP_URL } from "@/lib/share/giga3Attribution";

const DEFAULT_ORIGIN = GIGA3_APP_URL;

/** Canonical public URL for a GigaSocial post (read-only landing page). */
export function buildGigaSocialPostUrl(postId: string, origin?: string): string {
  const base = (origin?.replace(/\/$/, "") || DEFAULT_ORIGIN).replace(/\/$/, "");
  return `${base}/gigasocial/post/?id=${encodeURIComponent(postId)}`;
}

/** Deep link into the authenticated GigaSocial feed, scrolling to a post when present. */
export function buildGigaSocialFeedPostUrl(postId: string, origin?: string): string {
  const base = (origin?.replace(/\/$/, "") || DEFAULT_ORIGIN).replace(/\/$/, "");
  return `${base}/gigasocial/?highlight=${encodeURIComponent(postId)}`;
}
