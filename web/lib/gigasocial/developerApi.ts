import { getConvexSiteUrl } from "@/lib/convex/env";
import {
  buildGigaSocialApiBase,
  getDefaultApiVersion,
  readPreferredApiVersion,
} from "@/lib/gigasocial/apiVersion";
import { getGigaSocialFeatures } from "@/lib/gigasocial/featureFlags";

const DEFAULT_CONVEX_SITE = "https://perfect-lark-521.convex.site";

/** Base URL for the GigaSocial developer HTTP API (Convex site). */
export function getGigaSocialDeveloperApiBaseUrl(): string {
  const site = (getConvexSiteUrl() || DEFAULT_CONVEX_SITE).replace(/\/$/, "");
  const allowV2 = getGigaSocialFeatures().enableApiV2Client;
  const version = allowV2 ? readPreferredApiVersion(true) : getDefaultApiVersion();
  // v1 remains the only live backend surface; helper keeps versioning additive.
  return buildGigaSocialApiBase(site, version);
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
