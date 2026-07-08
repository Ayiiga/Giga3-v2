/** Strip invisible Unicode marks and control chars invalid in HTTP header values. */
const INVALID_HEADER_CHARS = /[\u0000-\u001F\u007F\u200B-\u200F\uFEFF\u2060\u00AD]/g;

export function sanitizeHttpHeaderValue(
  value: string | undefined | null
): string | undefined {
  if (value == null) return undefined;
  const cleaned = value.replace(INVALID_HEADER_CHARS, "").trim();
  return cleaned || undefined;
}
