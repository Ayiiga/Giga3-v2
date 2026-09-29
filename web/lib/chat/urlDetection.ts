/**
 * Client-side URL detection for the chat composer.
 * Validation mirrors convex/liveWeb/liveWebSecurity (public http(s) only).
 */
import { extractUrlsFromText, domainFromUrl } from "../../../convex/liveWeb/liveWebSecurity";

export { extractUrlsFromText };

export interface DetectedLink {
  url: string;
  domain: string;
  /** Best-effort display title from hostname. */
  title: string;
}

export function detectPrimaryLink(text: string): DetectedLink | null {
  const urls = extractUrlsFromText(text);
  const url = urls[0];
  if (!url) return null;
  const domain = domainFromUrl(url);
  const title = formatDomainTitle(domain);
  return { url, domain, title };
}

function formatDomainTitle(domain: string): string {
  const base = domain.split(".")[0] ?? domain;
  if (!base) return domain;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export type LinkActionId = "summarize" | "explain" | "key-points" | "ask" | "compare";

export const LINK_ACTIONS: Array<{ id: LinkActionId; label: string; prompt: (url: string) => string }> = [
  {
    id: "summarize",
    label: "Summarize",
    prompt: (url) =>
      `Please read this public link and summarize the key points with source attribution: ${url}`,
  },
  {
    id: "explain",
    label: "Explain",
    prompt: (url) =>
      `Please read this public link and explain it in clear language for my level: ${url}`,
  },
  {
    id: "key-points",
    label: "Extract key points",
    prompt: (url) =>
      `Please read this public link and extract the main facts as bullet points with citations: ${url}`,
  },
  {
    id: "ask",
    label: "Ask questions",
    prompt: (url) =>
      `Please read this public link, then ask me 3 check-understanding questions about it: ${url}`,
  },
  {
    id: "compare",
    label: "Compare sources",
    prompt: (url) =>
      `Please read this public link and compare it with other publicly accessible sources on the same topic. Note agreements, differences, and uncertainties: ${url}`,
  },
];
