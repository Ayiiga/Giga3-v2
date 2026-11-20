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
