/** Sanitize Mermaid SVG output before injecting into the DOM. */

const FORBIDDEN_TAGS =
  /<\/?(script|foreignObject|iframe|object|embed|link|style|meta|base|form|input|button|textarea|select|option)[\s>]/gi;

const EVENT_HANDLER_ATTR = /\s+on[a-z]+\s*=/gi;
const JAVASCRIPT_URI = /\s+(href|xlink:href)\s*=\s*["']\s*javascript:/gi;

export function sanitizeMermaidSvg(svg: string): string {
  if (!svg.trim().startsWith("<")) return "";

  let cleaned = svg
    .replace(FORBIDDEN_TAGS, "")
    .replace(EVENT_HANDLER_ATTR, " data-blocked=")
    .replace(JAVASCRIPT_URI, " data-blocked=");

  if (!/^<svg[\s>]/i.test(cleaned.trim())) {
    return "";
  }

  return cleaned;
}
