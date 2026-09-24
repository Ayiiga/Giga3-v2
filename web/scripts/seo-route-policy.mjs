/**
 * Public vs private URL policy for robots.txt, sitemaps, and IndexNow.
 * Robots rules are crawl hints. They are not authentication.
 */

export const CANONICAL_ORIGIN = "https://www.giga3ai.com";
export const CANONICAL_HOST = "www.giga3ai.com";
export const APEX_HOST = "giga3ai.com";

/** Authenticated or account surfaces. Not a security boundary. */
export const PRIVATE_PREFIXES = [
  "/api/",
  "/admin/",
  "/chat/",
  "/wallet/",
  "/credits/",
  "/payment/",
  "/workspace/",
  "/settings/",
  "/profile/",
  "/subscribe/",
  "/marketplace/sell/",
  "/marketplace/purchases/",
];

/** Public pages that must not compete in search. */
export const PUBLIC_NOT_INDEXABLE_PREFIXES = ["/help/", "/offline/", "/404"];

const SITEMAP_URL_LIMIT = 50000;

export function normalizePath(pathname) {
  if (!pathname || pathname.includes("?") || pathname.includes("#")) return null;
  if (!pathname.startsWith("/")) return null;
  if (pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

export function isPrivatePath(pathname) {
  const path = normalizePath(pathname);
  if (!path) return true;
  return PRIVATE_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix));
}

export function canonicalLoc(value) {
  let url;
  try {
    url = value.startsWith("http") ? new URL(value) : new URL(value, CANONICAL_ORIGIN);
  } catch {
    return null;
  }
  if (url.hostname !== CANONICAL_HOST && url.hostname !== APEX_HOST) return null;
  if (url.search || url.hash) return null;
  const path = normalizePath(url.pathname);
  if (!path || isPrivatePath(path)) return null;
  return `${CANONICAL_ORIGIN}${path === "/" ? "/" : path}`;
}

export function robotsTxt() {
  const disallows = PRIVATE_PREFIXES.map((prefix) => `Disallow: ${prefix}`).join("\n");
  return `User-agent: *
Allow: /
${disallows}
Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml
`;
}

export function sitemapUrlLimit() {
  return SITEMAP_URL_LIMIT;
}

/**
 * URLs whose loc or lastmod changed. Unchanged URLs are omitted.
 * Private URLs are never returned.
 */
export function changedPublicUrls(before, after) {
  const previous = new Map(before);
  const next = new Map(after);
  const changed = [];
  for (const [loc, lastmod] of next) {
    const canonical = canonicalLoc(loc);
    if (!canonical) continue;
    if (previous.get(loc) !== lastmod && previous.get(canonical) !== lastmod) {
      changed.push(canonical);
    }
  }
  for (const loc of previous.keys()) {
    const canonical = canonicalLoc(loc);
    if (!canonical) continue;
    if (!next.has(loc) && !next.has(canonical)) changed.push(canonical);
  }
  return [...new Set(changed)];
}

/** Redirect apex host to the canonical www origin. Returns null when already canonical. */
export function apexToWwwRedirect(requestUrl) {
  const url = new URL(requestUrl);
  if (url.hostname !== APEX_HOST) return null;
  url.hostname = CANONICAL_HOST;
  url.protocol = "https:";
  return url.toString();
}
