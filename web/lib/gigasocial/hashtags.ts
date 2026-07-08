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
