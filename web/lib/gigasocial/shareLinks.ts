import { getConvexSiteUrl } from "@/lib/convex/env";
import { GIGA3_APP_URL } from "@/lib/share/giga3Attribution";

const DEFAULT_ORIGIN = GIGA3_APP_URL;
const DEFAULT_CONVEX_SITE = "https://perfect-lark-521.convex.site";

/** Canonical public URL for a GigaSocial post (read-only landing page). */
export function buildGigaSocialPostUrl(postId: string, origin?: string): string {
  const base = (origin?.replace(/\/$/, "") || DEFAULT_ORIGIN).replace(/\/$/, "");
  return `${base}/gigasocial/post/?id=${encodeURIComponent(postId)}`;
}

/**
 * Crawler-facing share URL with per-post Open Graph HTML.
 * Messaging apps fetch this directly; humans are redirected to the canonical post page.
 */
export function buildGigaSocialSharePreviewUrl(postId: string): string {
  const site = (getConvexSiteUrl() || DEFAULT_CONVEX_SITE).replace(/\/$/, "");
  return `${site}/gigasocial/post/preview?id=${encodeURIComponent(postId)}`;
}

/** Deep link into the authenticated GigaSocial feed, scrolling to a post when present. */
export function buildGigaSocialFeedPostUrl(postId: string, origin?: string): string {
  const base = (origin?.replace(/\/$/, "") || DEFAULT_ORIGIN).replace(/\/$/, "");
  return `${base}/gigasocial/?highlight=${encodeURIComponent(postId)}`;
}

/** Public profile URL by @handle (query param for static-export client routing). */
export function buildGigaSocialProfileUrl(handle: string, origin?: string): string {
  const base = (origin?.replace(/\/$/, "") || DEFAULT_ORIGIN).replace(/\/$/, "");
  const normalized = handle.replace(/^@/, "").trim().toLowerCase();
  if (!normalized) return `${base}/gigasocial/profile/`;
  return `${base}/gigasocial/profile/?handle=${encodeURIComponent(normalized)}`;
}
