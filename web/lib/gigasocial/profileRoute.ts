/** Parse post id from GigaSocial public post URLs (query or path segment). */
export function parsePostId(pathname: string, search: string): string {
  const fromQuery = new URLSearchParams(search).get("id");
  if (fromQuery) return fromQuery.trim();

  const segments = pathname.replace(/\/$/, "").split("/").filter(Boolean);
  const postIndex = segments.indexOf("post");
  if (postIndex >= 0) {
    const segment = segments[postIndex + 1];
    if (segment && segment !== "index.html") {
      return decodeURIComponent(segment).trim();
    }
  }

  return "";
}

/** Parse @handle from GigaSocial public profile URLs (query or path segment). */
export function parseProfileHandle(pathname: string, search: string): string {
  const fromQuery = new URLSearchParams(search).get("handle");
  if (fromQuery) {
    return fromQuery.replace(/^@/, "").trim().toLowerCase();
  }

  const segments = pathname.replace(/\/$/, "").split("/").filter(Boolean);
  const profileIndex = segments.indexOf("profile");
  if (profileIndex >= 0) {
    const segment = segments[profileIndex + 1];
    if (segment && segment !== "index.html") {
      return decodeURIComponent(segment).replace(/^@/, "").trim().toLowerCase();
    }
  }

  return "";
}
