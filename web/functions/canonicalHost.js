/** Apex → www. Pages `_redirects` cannot change hostname. */

export const CANONICAL_HOST = "www.giga3ai.com";
export const APEX_HOST = "giga3ai.com";

/** Match the static export trailingSlash convention on apex → www hops. */
function normalizeTrailingSlash(pathname) {
  if (pathname === "/") return "/";
  if (/\.[a-z0-9]+$/i.test(pathname)) return pathname;
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

export function apexToWwwRedirect(requestUrl) {
  const url = new URL(requestUrl);
  if (url.hostname !== APEX_HOST) return null;
  url.hostname = CANONICAL_HOST;
  url.protocol = "https:";
  url.pathname = normalizeTrailingSlash(url.pathname);
  return url.toString();
}
