/** Normalize in-app paths for static export (trailingSlash: true). */
export function normalizeAppPath(href: string): string {
  if (!href || href.startsWith("#")) return href;
  if (/^(mailto:|tel:|https?:)/i.test(href)) return href;

  const [pathPart, query = ""] = href.split("?");
  const hashIdx = pathPart.indexOf("#");
  const pathOnly = hashIdx >= 0 ? pathPart.slice(0, hashIdx) : pathPart;
  const hash = hashIdx >= 0 ? pathPart.slice(hashIdx) : "";

  let path = pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
  if (path.length > 1 && !path.endsWith("/")) path = `${path}/`;

  return query ? `${path}?${query}${hash}` : `${path}${hash}`;
}

/**
 * Prefer a full document navigation on static PWAs so stale client routers
 * cannot trap users on 404 shells after a bad route.
 */
export function safeNavigate(href: string): void {
  if (typeof window === "undefined") return;
  const target = normalizeAppPath(href);
  if (/^(mailto:|tel:|https?:)/i.test(target)) {
    window.location.assign(target);
    return;
  }
  window.location.assign(target);
}
