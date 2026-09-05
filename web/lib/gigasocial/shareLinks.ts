import { GIGA3_APP_URL } from "@/lib/share/giga3Attribution";
import { gigaSocialPostPath, gigaSocialProfilePath } from "@/lib/seo/publicPaths";

const DEFAULT_ORIGIN = GIGA3_APP_URL;

/** Canonical public URL for a GigaSocial post (read-only landing page). */
export function buildGigaSocialPostUrl(postId: string, origin?: string): string {
  const base = (origin?.replace(/\/$/, "") || DEFAULT_ORIGIN).replace(/\/$/, "");
  return `${base}${gigaSocialPostPath(postId)}`;
}

/** Crawler-facing OG image on the Giga3 domain (proxied to Convex in Pages middleware). */
export function buildGigaSocialOgImageUrl(postId: string, origin?: string): string {
  const base = (origin?.replace(/\/$/, "") || DEFAULT_ORIGIN).replace(/\/$/, "");
  return `${base}/gigasocial/post/${encodeURIComponent(postId)}/og-image/`;
}

/**
 * @deprecated Use buildGigaSocialPostUrl for user-facing shares. Middleware fetches OG HTML internally.
 */
export function buildGigaSocialSharePreviewUrl(postId: string): string {
  return buildGigaSocialPostUrl(postId);
}

/** Deep link into the authenticated GigaSocial feed. */
export function buildGigaSocialFeedUrl(
  options?: {
    stories?: boolean;
    ring?: string;
    highlight?: string;
    tab?: string;
  },
  origin?: string
): string {
  const base = (origin?.replace(/\/$/, "") || DEFAULT_ORIGIN).replace(/\/$/, "");
  const params = new URLSearchParams();
  if (options?.stories) params.set("stories", "1");
  if (options?.ring) params.set("ring", options.ring);
  if (options?.highlight) params.set("highlight", options.highlight);
  if (options?.tab) params.set("tab", options.tab);
  const query = params.toString();
  return query ? `${base}/gigasocial/?${query}` : `${base}/gigasocial/`;
}

/** Deep link into the authenticated GigaSocial feed, scrolling to a post when present. */
export function buildGigaSocialFeedPostUrl(postId: string, origin?: string): string {
  return buildGigaSocialFeedUrl({ highlight: postId }, origin);
}

/** Public profile URL by @handle. */
export function buildGigaSocialProfileUrl(handle: string, origin?: string): string {
  const base = (origin?.replace(/\/$/, "") || DEFAULT_ORIGIN).replace(/\/$/, "");
  const normalized = handle.replace(/^@/, "").trim().toLowerCase();
  if (!normalized) return `${base}/gigasocial/profile/`;
  return `${base}${gigaSocialProfilePath(normalized)}`;
}
