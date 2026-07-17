import { getConvexSiteUrl } from "@/lib/convex/env";

const DEFAULT_CONVEX_SITE = "https://perfect-lark-521.convex.site";

/** Base URL for the GigaSocial developer HTTP API (Convex site). */
export function getGigaSocialDeveloperApiBaseUrl(): string {
  const site = (getConvexSiteUrl() || DEFAULT_CONVEX_SITE).replace(/\/$/, "");
  return `${site}/gigasocial/api/v1`;
}

export function buildGigaSocialDeveloperApiUrl(
  path: string,
  params?: Record<string, string | number | undefined>
): string {
  const base = getGigaSocialDeveloperApiBaseUrl();
  const normalizedPath = path.replace(/^\//, "");
  const url = new URL(`${base}/${normalizedPath}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}
