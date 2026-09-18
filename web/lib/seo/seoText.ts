/**
 * SEO text clamps — keep rendered <title> ≤ 70 chars and meta descriptions
 * within 50–165 chars (seo-audit thresholds) while preserving uniqueness
 * tokens (post refs, handles) so duplicate-title/description errors never fire.
 */

export const SEO_TITLE_MAX = 70;
export const SEO_DESCRIPTION_MIN = 50;
export const SEO_DESCRIPTION_MAX = 165;

/** Root layout appends " | Giga3 AI" (11 chars) unless the title already has brand. */
const LAYOUT_SUFFIX = " | Giga3 AI";

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncateWords(value: string, max: number): string {
  const text = clean(value);
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1).trimEnd();
  const lastSpace = cut.lastIndexOf(" ");
  const head = lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut;
  return `${head}…`;
}

/**
 * Clamp a document title so the rendered <title> (after the root layout
 * template) stays within SEO_TITLE_MAX. Keeps the trailing uniqueness
 * token (e.g. post ref) whenever one is present.
 */
export function clampSeoTitle(title: string, uniqueToken?: string): string {
  const text = clean(title);
  const token = uniqueToken?.trim();
  const optimistic = text.includes("Giga3") ? SEO_TITLE_MAX : SEO_TITLE_MAX - LAYOUT_SUFFIX.length;
  const first = clampWithBudget(text, token, optimistic);
  // Truncation may have removed the "Giga3" substring that kept the layout
  // title absolute — re-clamp so the appended suffix still fits.
  if (!first.includes("Giga3")) {
    return clampWithBudget(text, token, SEO_TITLE_MAX - LAYOUT_SUFFIX.length);
  }
  return first;
}

function clampWithBudget(text: string, token: string | undefined, budget: number): string {
  if (!token) return truncateWords(text, budget);
  const head = clean(text.split(token).join(" ")).replace(/[·\-–—|,:\s]+$/, "");
  const headBudget = budget - token.length - 3; // " · " + token
  if (!head) return token.slice(0, budget);
  if (headBudget < 10) return truncateWords(`${head} ${token}`, budget);
  return `${truncateWords(head, headBudget)} · ${token}`;
}

const DESCRIPTION_PADDER = "— more on Giga3 AI, Africa's AI Super App";

/**
 * Clamp a meta description to [SEO_DESCRIPTION_MIN, SEO_DESCRIPTION_MAX].
 * Short user content is padded with a brand suffix instead of being left thin.
 * Pass uniqueTail (post ref, handle) to keep the tail intact so truncated
 * descriptions stay unique across pages.
 */
export function clampSeoDescription(description: string, uniqueTail?: string): string {
  const tail = uniqueTail?.trim();
  const text = clean(tail ? description.split(tail).join(" ") : description);
  if (!tail) {
    if (text.length > SEO_DESCRIPTION_MAX) return truncateWords(text, SEO_DESCRIPTION_MAX);
    if (text.length >= SEO_DESCRIPTION_MIN) return text;
    const padded = `${text} ${DESCRIPTION_PADDER}`;
    if (padded.length <= SEO_DESCRIPTION_MAX) return padded;
    return truncateWords(padded, SEO_DESCRIPTION_MAX);
  }
  const tailBudget = tail.length + 3; // " · " + tail
  const headBudget = SEO_DESCRIPTION_MAX - tailBudget;
  const head = text.length > headBudget ? truncateWords(text, headBudget) : text;
  const combined = head ? `${head} · ${tail}` : tail;
  if (combined.length >= SEO_DESCRIPTION_MIN) return combined;
  return truncateWords(`${combined} ${DESCRIPTION_PADDER}`, SEO_DESCRIPTION_MAX);
}
