/** Strip zero-width and BOM characters that break fetch/WebSocket URLs in production. */
const INVISIBLE_URL_CHARS = /[\u200B-\u200D\uFEFF\u2060\u00AD]/g;

export function sanitizeUrlString(url: string | undefined | null): string | undefined {
  if (url == null) return undefined;
  const cleaned = url.replace(INVISIBLE_URL_CHARS, "").trim();
  return cleaned || undefined;
}
