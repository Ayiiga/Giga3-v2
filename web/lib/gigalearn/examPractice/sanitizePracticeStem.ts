/**
 * Presentation-time cleanup for practice stems / explanations.
 * Does not mutate bank JSON — only strips PDF/export artifacts that leak into UI.
 */

const HEADER_LINE =
  /^\s*GigaLearn[^\n]*Practice\s*$/gim;
const PAGE_LINE = /^\s*Page\s+\d+\s*$/gim;
const TRUE_FALSE_LINE = /^\s*(TRUE|FALSE)\s*$/gim;

/**
 * Remove leaked TRUE/FALSE answer rows, guide headers, and page markers from stems.
 * Preserves the learner-facing statement/question wording.
 */
export function sanitizePracticeStem(text: string): string {
  if (!text) return text;
  let out = text.replace(/\u007f/g, "—");
  out = out.replace(HEADER_LINE, "");
  out = out.replace(PAGE_LINE, "");
  out = out.replace(TRUE_FALSE_LINE, "");
  // Collapse leftover blank lines / trailing spaces without rewriting prose.
  out = out
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return out;
}

/** Same cleanup for per-option notes that inherited export artifacts. */
export function sanitizePracticeExplanation(text: string): string {
  return sanitizePracticeStem(text);
}
