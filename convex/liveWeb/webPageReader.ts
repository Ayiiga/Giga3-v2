"use node";

import { BrowseError } from "./browsePolicy";
import {
  liveWebFetchTimeoutMs,
  liveWebMaxPageBytes,
} from "./liveWebConfig";
import { redactSensitivePatterns, validatePublicHttpUrl } from "./liveWebSecurity";
import { fetchPublicDocument } from "./safePublicFetch";
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

function extractPublicationDate(html: string): string | undefined {
  // Only accept dates explicitly supplied by page metadata. Never infer dates
  // from URL paths, filenames, copyright notices, or the current retrieval time.
  const metaPatterns = [
    /<meta[^>]+(?:property|name)=["']article:published_time["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+(?:property|name)=["']datePublished["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+(?:property|name)=["']pubdate["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+(?:property|name)=["']date["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  ];
  for (const pattern of metaPatterns) {
    const match = html.match(pattern);
    const value = match?.[1]?.trim();
    if (value && Number.isFinite(Date.parse(value))) return value;
  }
  const timeMatch = html.match(/<time[^>]+datetime=["']([^"']+)["'][^>]*>/i);
  const timeValue = timeMatch?.[1]?.trim();
  if (timeValue && Number.isFinite(Date.parse(timeValue))) return timeValue;

  const jsonLdMatches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) ?? [];
  for (const block of jsonLdMatches) {
    const json = block.replace(/^<[\s\S]*?>/i, "").replace(/<\/script>$/i, "");
    try {
      const parsed = JSON.parse(json) as { datePublished?: unknown; dateCreated?: unknown; dateModified?: unknown; "@graph"?: unknown[] };
      const candidates = [parsed.datePublished, parsed.dateCreated, ...(Array.isArray(parsed["@graph"]) ? parsed["@graph"].flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const record = item as Record<string, unknown>;
        return [record.datePublished, record.dateCreated];
      }) : [])];
      for (const candidate of candidates) {
        if (typeof candidate === "string" && Number.isFinite(Date.parse(candidate))) return candidate;
      }
    } catch {
      // Ignore malformed structured metadata and continue without a date.
    }
  }
  return undefined;
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
        const res = await fetchPublicDocument(validated.url.toString(), {
          timeoutMs: options.timeoutMs,
          maxBytes: options.maxBytes,
          signal: controller.signal,
        });

        const contentType = res.contentType;
        if (
          !contentType.includes("text/html") &&
          !contentType.includes("text/plain") &&
          !contentType.includes("application/xhtml")
        ) {
          throw new Error(`Unsupported content type: ${contentType.split(";")[0] || "unknown"}`);
        }

        const html = res.body;
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
        if (controller.signal.aborted || (err instanceof BrowseError && err.code === "timeout")) {
          throw new Error(`Page fetch timed out after ${options.timeoutMs}ms`);
        }
        if (err instanceof BrowseError) throw new Error(err.message);
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
