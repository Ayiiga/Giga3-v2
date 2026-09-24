/** Apex → www. Pages `_redirects` cannot change hostname. */

export const CANONICAL_HOST = "www.giga3ai.com";
export const APEX_HOST = "giga3ai.com";

export function apexToWwwRedirect(requestUrl) {
  const url = new URL(requestUrl);
  if (url.hostname !== APEX_HOST) return null;
  url.hostname = CANONICAL_HOST;
  url.protocol = "https:";
  return url.toString();
}
