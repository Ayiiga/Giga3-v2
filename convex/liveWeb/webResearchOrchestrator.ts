import {
  isLiveWebEnabled,
  liveWebMaxPagesToRead,
  liveWebMaxSearchResults,
  liveWebSearchTimeoutMs,
} from "./liveWebConfig";
import { extractUrlsFromText, redactSensitivePatterns } from "./liveWebSecurity";
import { resolveWebSearchProvider } from "./providers/registry";
import { defaultFetchOptions, defaultPageReader } from "./webPageReader";
import type {
  LiveWebProgressStage,
  LiveWebSource,
  WebResearchResult,
} from "./types";

export type ProgressCallback = (stage: LiveWebProgressStage) => Promise<void>;

function sourceFromSearch(row: {
  title: string;
  uri: string;
  domain: string;
  snippet?: string;
}): LiveWebSource {
  return {
    title: row.title,
    uri: row.uri,
    domain: row.domain,
    excerpt: row.snippet,
    accessedAt: Date.now(),
  };
}

function buildContextBlock(
  query: string,
  pages: Array<{ title: string; domain: string; uri: string; text: string }>,
  searchSnippets: LiveWebSource[]
): string {
  const lines: string[] = [
    "LIVE WEB RESEARCH CONTEXT (public sources only — cite these in your answer):",
    `User query: ${query.slice(0, 500)}`,
  ];

  if (searchSnippets.length) {
    lines.push("", "Search results:");
    for (const [i, source] of searchSnippets.entries()) {
      lines.push(
        `[S${i + 1}] ${source.title} (${source.domain})`,
        source.excerpt ? `Snippet: ${source.excerpt}` : "",
        source.uri
      );
    }
  }

  if (pages.length) {
    lines.push("", "Page excerpts:");
    for (const [i, page] of pages.entries()) {
      lines.push(
        `[P${i + 1}] ${page.title} (${page.domain})`,
        page.uri,
        redactSensitivePatterns(page.text.slice(0, 4000))
      );
    }
  }

  lines.push(
    "",
    "Instructions:",
    "- Prefer facts from the live web context above over stale training knowledge.",
    "- Compare multiple sources when they disagree.",
    "- If information may be outdated, say so and note when it was accessed.",
    "- Do not invent URLs or sources.",
    "- Clearly distinguish live web facts from general knowledge."
  );

  return lines.filter(Boolean).join("\n");
}

export async function runWebResearch(args: {
  query: string;
  onProgress?: ProgressCallback;
}): Promise<WebResearchResult> {
  const warnings: string[] = [];
  if (!isLiveWebEnabled()) {
    return {
      contextBlock: "",
      sources: [],
      usedLiveSearch: false,
      providerId: null,
      warnings: ["Live web is disabled on the server."],
    };
  }

  const searchProvider = resolveWebSearchProvider();
  const explicitUrls = extractUrlsFromText(args.query);
  const sources: LiveWebSource[] = [];
  const pages: Array<{ title: string; domain: string; uri: string; text: string }> = [];

  await args.onProgress?.("searching");

  let searchResults: LiveWebSource[] = [];
  if (searchProvider) {
    try {
      const rows = await searchProvider.search(args.query, {
        maxResults: liveWebMaxSearchResults(),
        timeoutMs: liveWebSearchTimeoutMs(),
      });
      searchResults = rows.map(sourceFromSearch);
      sources.push(...searchResults);
    } catch (err) {
      warnings.push(
        `Search provider failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  } else {
    warnings.push(
      "No dedicated search API configured (SERPER_API_KEY or BRAVE_SEARCH_API_KEY). Gemini Google Search grounding will be used during answer generation."
    );
  }

  const urlsToRead = new Set<string>(explicitUrls);
  for (const result of searchResults.slice(0, liveWebMaxPagesToRead())) {
    urlsToRead.add(result.uri);
  }

  const reader = defaultPageReader;
  const fetchOptions = defaultFetchOptions();
  let readCount = 0;

  for (const url of urlsToRead) {
    if (readCount >= liveWebMaxPagesToRead()) break;
    await args.onProgress?.(readCount === 0 ? "opening_source" : "reading");
    try {
      const page = await reader.read(url, fetchOptions);
      pages.push({
        title: page.title,
        domain: page.domain,
        uri: page.uri,
        text: page.text,
      });
      sources.push({
        title: page.title,
        uri: page.uri,
        domain: page.domain,
        excerpt: page.excerpt,
        accessedAt: page.accessedAt,
      });
      readCount += 1;
    } catch (err) {
      warnings.push(
        `Could not read ${url}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  if (sources.length > 1) {
    await args.onProgress?.("comparing");
  }

  await args.onProgress?.("preparing_answer");

  const uniqueSources = dedupeSources(sources);
  const contextBlock =
    uniqueSources.length || pages.length
      ? buildContextBlock(args.query, pages, searchResults)
      : searchProvider
        ? ""
        : "";

  return {
    contextBlock,
    sources: uniqueSources,
    usedLiveSearch: Boolean(searchProvider && searchResults.length),
    providerId: searchProvider?.id ?? (searchResults.length ? "gemini_grounding" : null),
    warnings,
  };
}

function dedupeSources(sources: LiveWebSource[]): LiveWebSource[] {
  const map = new Map<string, LiveWebSource>();
  for (const source of sources) {
    if (!map.has(source.uri)) map.set(source.uri, source);
  }
  return [...map.values()].slice(0, 8);
}

export function mergeLiveWebSources(
  researchSources: LiveWebSource[],
  groundingSources: Array<{ title: string; uri: string }>
): LiveWebSource[] {
  const merged = [...researchSources];
  const seen = new Set(merged.map((s) => s.uri));
  for (const source of groundingSources) {
    if (seen.has(source.uri)) continue;
    merged.push({
      title: source.title,
      uri: source.uri,
      domain: source.uri.includes("://")
        ? new URL(source.uri).hostname.replace(/^www\./i, "")
        : source.uri,
      accessedAt: Date.now(),
    });
    seen.add(source.uri);
  }
  return merged.slice(0, 8);
}

export function buildLiveWebMetadata(args: {
  sources: LiveWebSource[];
  usedLiveWeb: boolean;
  providerId?: string | null;
}): string {
  const metadata = {
    basis: args.usedLiveWeb && args.sources.length ? ("live_web" as const) : ("knowledge" as const),
    sources: args.sources,
    providerId: args.providerId ?? undefined,
  };
  return JSON.stringify(metadata);
}
