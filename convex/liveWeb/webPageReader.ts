import {
  liveWebFetchTimeoutMs,
  liveWebMaxPageBytes,
} from "./liveWebConfig";
import {
  redactSensitivePatterns,
  validatePublicHttpUrl,
} from "./liveWebSecurity";
import type { WebPageContent, WebPageReader } from "./types";

const MAX_EXCERPT_CHARS = 480;
const MAX_TEXT_CHARS = 12_000;

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlEntities(match[1].replace(/\s+/g, " ").trim()) : "";
}

function htmlToText(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ");
  text = decodeHtmlEntities(text);
  return text.replace(/\s+\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function buildExcerpt(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= MAX_EXCERPT_CHARS) return normalized;
  return `${normalized.slice(0, MAX_EXCERPT_CHARS - 1).trim()}…`;
}

async function readResponseBodyLimited(
  res: Response,
  maxBytes: number
): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) {
    const text = await res.text();
    return text.slice(0, maxBytes);
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    const remaining = maxBytes - total;
    const slice = value.byteLength > remaining ? value.slice(0, remaining) : value;
    chunks.push(slice);
    total += slice.byteLength;
  }
  reader.cancel().catch(() => undefined);

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

export function createFetchPageReader(): WebPageReader {
  return {
    async read(rawUrl, options) {
      const validated = validatePublicHttpUrl(rawUrl);
      if (!validated.ok) {
        throw new Error(validated.reason);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs);
      try {
        const res = await fetch(validated.url.toString(), {
          method: "GET",
          redirect: "follow",
          headers: {
            Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
            "User-Agent": "Giga3LiveWeb/1.0 (+https://www.giga3ai.com)",
          },
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} for ${validated.domain}`);
        }

        const contentType = res.headers.get("content-type") ?? "";
        if (
          !contentType.includes("text/html") &&
          !contentType.includes("text/plain") &&
          !contentType.includes("application/xhtml")
        ) {
          throw new Error(`Unsupported content type: ${contentType.split(";")[0]}`);
        }

        const html = await readResponseBodyLimited(res, options.maxBytes);
        const title = extractTitle(html) || validated.domain;
        const text = redactSensitivePatterns(
          htmlToText(html).slice(0, MAX_TEXT_CHARS)
        );
        if (!text) {
          throw new Error("No readable text on page");
        }

        return {
          uri: validated.url.toString(),
          title,
          domain: validated.domain,
          text,
          excerpt: buildExcerpt(text),
          accessedAt: Date.now(),
        } satisfies WebPageContent;
      } catch (err) {
        if (controller.signal.aborted) {
          throw new Error(`Page fetch timed out after ${options.timeoutMs}ms`);
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export const defaultPageReader = createFetchPageReader();

export function defaultFetchOptions() {
  return {
    timeoutMs: liveWebFetchTimeoutMs(),
    maxBytes: liveWebMaxPageBytes(),
  };
}
