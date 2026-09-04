/** Parse listing id from Marketplace product URLs (query or path segment). */
export function parseMarketplaceListingId(pathname: string, search: string): string {
  const fromQuery = new URLSearchParams(search).get("id");
  if (fromQuery) return fromQuery.trim();

  const segments = pathname.replace(/\/$/, "").split("/").filter(Boolean);
  const itemIndex = segments.indexOf("item");
  if (itemIndex >= 0) {
    const segment = segments[itemIndex + 1];
    if (segment && segment !== "index.html") {
      return decodeURIComponent(segment).trim();
    }
  }

  return "";
}
