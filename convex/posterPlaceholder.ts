/** Identify unfinished missing-person layouts emitted by text chat. */
export function missingPersonPlaceholderIndex(text: string): number {
  const opening = /^[ \t]*```(?:giga-visual|visual)[ \t]*\r?\n[ \t\r\n]*\{[ \t\r\n]*"(?:type|kind)"\s*:\s*"poster"/gim;
  for (const match of text.matchAll(opening)) {
    const afterOpening = text.slice(match.index + match[0].length);
    const closing = afterOpening.search(/^\s*```[ \t]*$/m);
    const spec = closing < 0 ? afterOpening : afterOpening.slice(0, closing);
    if (/"title"\s*:\s*"missing[- ]person"/i.test(spec) &&
        /\bplaceholder\b|\[(?:please provide|your contact|location, date)/i.test(spec)) return match.index;
  }
  return -1;
}

export const MISSING_PERSON_PLACEHOLDER_FALLBACK =
  "I couldn’t render the poster here. If this chat already has your poster, open it and tap the pencil to update it.";


/**
 * Reject a textual design handoff when the assistant was expected to deliver
 * an actual missing-person poster. Ordinary URL footers are not image assets.
 */
export function isUndeliveredMissingPersonPosterReply(reply: string): boolean {
  if (!/\bmissing[- ]person\b/i.test(reply) || !/\bposter\b/i.test(reply)) return false;
  // Do not hide a successfully delivered image, whether rendered by Convex or
  // returned by an external image provider.
  if (/!\[[^\]]*\]\(https?:\/\/[^)]+\)/i.test(reply) ||
      /https?:\/\/[^\s)]+(?:\/api\/storage\/[\w-]+|\.(?:svg|png|jpe?g|webp)(?:\?[\w=&%-]+)?)/i.test(reply)) return false;
  return /\b(?:giga-visual|visual editor|text layout|text-only layout|copy and paste|paste (?:it|this|the text) into|color palette|layout and typography|insert (?:a )?(?:large[, ]+clear )?photo|design tool|technical limitation|couldn['’]t render|cannot (?:directly )?(?:render|display)|not (?:directly )?(?:rendering|displaying))\b/i.test(reply);
}
