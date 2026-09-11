import { getConvexSiteUrl } from "@/lib/convex/env";

const DEFAULT_CONVEX_SITE = "https://perfect-lark-521.convex.site";

/** Base URL for Premium user API keys (Convex HTTP /api/v1/*). */
export function getUserDeveloperApiBaseUrl(): string {
  const site = (getConvexSiteUrl() || DEFAULT_CONVEX_SITE).replace(/\/$/, "");
  return `${site}/api/v1`;
}

export function buildUserDeveloperApiUrl(path: string): string {
  const base = getUserDeveloperApiBaseUrl();
  const normalizedPath = path.replace(/^\//, "");
  return `${base}/${normalizedPath}`;
}
