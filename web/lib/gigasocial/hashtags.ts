/** Hashtag parsing and display helpers for GigaSocial. */

const HASHTAG_RE = /#([\p{L}\p{N}_]{1,64})/gu;

export function extractHashtagsFromText(raw: string): string[] {
  const tags = new Set<string>();
  for (const match of raw.matchAll(HASHTAG_RE)) {
    const tag = match[1]?.toLowerCase();
    if (tag) tags.add(tag);
  }
  return [...tags];
}

/** Caption text with hashtag tokens removed for cleaner feed display. */
export function stripHashtagsFromText(raw: string): string {
  return raw
    .replace(HASHTAG_RE, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Single-line compact hashtag display (e.g. `#ai #giga3 +2`). */
export function formatCompactHashtags(tags: string[], maxVisible = 5): string {
  if (!tags.length) return "";
  const visible = tags.slice(0, maxVisible);
  const extra = tags.length - maxVisible;
  const line = visible.map((tag) => `#${tag}`).join(" ");
  return extra > 0 ? `${line} +${extra}` : line;
}

export function renderCaptionWithHashtags(
  body: string
): Array<{ type: "text" | "hashtag"; value: string }> {
  const parts: Array<{ type: "text" | "hashtag"; value: string }> = [];
  let lastIndex = 0;
  for (const match of body.matchAll(HASHTAG_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ type: "text", value: body.slice(lastIndex, index) });
    }
    parts.push({ type: "hashtag", value: match[0] });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < body.length) {
    parts.push({ type: "text", value: body.slice(lastIndex) });
  }
  return parts.length ? parts : [{ type: "text", value: body }];
}
