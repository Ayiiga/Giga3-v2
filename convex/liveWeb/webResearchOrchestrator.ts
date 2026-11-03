"use node";

import {
  buildEvidenceContextBlock,
  buildNewsEvidencePackage,
  logNewsEvidenceEvent,
} from "../newsEvidence/pipeline";
import {
  buildResearchSearchQuery,
  isNewsCapability,
  NEWS_RESPONSE_FORMAT_GUIDANCE,
  type ResearchCapabilityId,
} from "../researchCapabilities";
import {
  isLiveWebEnabled,
  liveWebMaxPagesToRead,
  liveWebMaxSearchResults,
  liveWebSearchTimeoutMs,
} from "./liveWebConfig";
import { sanitizeLiveWebSourceExcerpt } from "../newsEvidence/userPresentation";
import { extractUrlsFromText, redactSensitivePatterns } from "./liveWebSecurity";
import { resolveWebSearchProviders } from "./providers/registry";
import { defaultFetchOptions, defaultPageReader } from "./webPageReader";
import type {
  LiveWebProgressStage,
  LiveWebResponseBasis,
  LiveWebSource,
  WebResearchResult,
} from "./types";

export type ProgressCallback = (stage: LiveWebProgressStage) => Promise<void>;

function canonicalSourceUri(uri: string): string {
  try {
    const url = new URL(uri);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\\./i, "");
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\\/+$/, "");
    return url.toString();
  } catch { return uri.trim(); }
}

function sourceFromSearch(row: {
  title: string;
  uri: string;
  domain: string;
  snippet?: string;
  publishedAt?: string;
  publicationDateSource?: "search_metadata" | "page_metadata";
}): LiveWebSource {
  return {
    title: row.title,
    uri: row.uri,
    domain: row.domain,
    excerpt: sanitizeLiveWebSourceExcerpt(row.snippet),
    accessedAt: Date.now(),
    ...(row.publishedAt ? { publishedAt: row.publishedAt, publicationDateSource: row.publicationDateSource ?? "search_metadata" } : {}),
  };
}

function buildContextBlock(
  query: string,
  pages: Array<{ title: string; domain: string; uri: string; text: string; publishedAt?: string }>,
  searchSnippets: LiveWebSource[],
  capability?: ResearchCapabilityId
): string {
  const lines: string[] = [
    "LIVE WEB RESEARCH CONTEXT (public sources only — cite these in your answer):",
    "Only pages listed below were retrieved. If a page is missing, say it could not be retrieved. Do not claim it was visited.",
    `User query: ${query.slice(0, 500)}`,
  ];

  if (capability === "ghana_news" || capability === "breaking_news") {
    lines.push(
      "",
      "Ghana news assistant rules:",
      "- Cross-check important claims across multiple credible Ghana outlets when possible.",
      "- Prefer official Ghana sources for government, election, and security stories.",
      "- Show publication dates in prose when available; link sources by publisher name.",
      "- Never invent current Ghana news."
    );
  }

  if (searchSnippets.length) {
    lines.push("", "Search results:");
    for (const [i, source] of searchSnippets.entries()) {
      lines.push(
        `[S${i + 1}] ${source.title} (${source.domain})`,
        source.publishedAt ? `Publication date (${source.publicationDateSource === "page_metadata" ? "page metadata" : "search metadata; not independently verified"}): ${source.publishedAt}` : "Publication date: not established",
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
        page.publishedAt ? `Publication date (page metadata): ${page.publishedAt}` : "Publication date: not established from page metadata",
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
    "- Never infer publication dates from URL paths, filenames, or retrieval dates.",
    "- Distinguish search-provider date metadata from dates found in retrieved page metadata.",
    "- A PDF URL is not evidence that the PDF was read; only describe PDF contents when extraction succeeded.",
    "- Clearly distinguish live web facts from general knowledge.",
    "- User-visible answer must be clean: no Confidence/Why/tier/provider diagnostics.",
    NEWS_RESPONSE_FORMAT_GUIDANCE
  );

  return lines.filter(Boolean).join("\n");
}

export async function runWebResearch(args: {
  query: string;
  researchCapability?: ResearchCapabilityId;
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
      pagesReadUrls: [],
    };
  }

  const searchProviders = resolveWebSearchProviders();
  const explicitUrls = extractUrlsFromText(args.query);
  const sources: LiveWebSource[] = [];
  const pages: Array<{ title: string; domain: string; uri: string; text: string; publishedAt?: string }> = [];

  await args.onProgress?.("searching");

  const searchQuery = buildResearchSearchQuery(
    args.query,
    args.researchCapability ?? "live_web"
  );

  let searchResults: LiveWebSource[] = [];
  let activeSearchProviderId: string | null = null;

  if (searchProviders.length === 0) {
    warnings.push(
      "No dedicated search API configured (TAVILY_API_KEY, SERPER_API_KEY, or BRAVE_SEARCH_API_KEY). Gemini Google Search grounding will be used during answer generation."
    );
  } else {
    for (const provider of searchProviders) {
      try {
        const rows = await provider.search(searchQuery, {
          maxResults: liveWebMaxSearchResults(),
          timeoutMs: liveWebSearchTimeoutMs(),
        });
        if (rows.length > 0) {
          searchResults = rows.map(sourceFromSearch);
          sources.push(...searchResults);
          activeSearchProviderId = provider.id;
          break;
        }
        warnings.push(`Search provider ${provider.id} returned no results.`);
      } catch (err) {
        warnings.push(
          `Search provider ${provider.id} failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
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
        ...(page.publishedAt ? { publishedAt: page.publishedAt } : {}),
      });
      const pageKey = canonicalSourceUri(page.uri);
      const existingSourceIndex = sources.findIndex((source) => canonicalSourceUri(source.uri) === pageKey);
      const pageSource: LiveWebSource = {
        title: page.title,
        uri: page.uri,
        domain: page.domain,
        excerpt: sanitizeLiveWebSourceExcerpt(page.excerpt),
        accessedAt: page.accessedAt,
        ...(page.publishedAt ? { publishedAt: page.publishedAt, publicationDateSource: "page_metadata" as const } : {}),
      };
      if (existingSourceIndex >= 0) {
        // Retrieved-page metadata is stronger than search-result metadata.
        sources[existingSourceIndex] = { ...sources[existingSourceIndex], ...pageSource };
      } else {
        sources.push(pageSource);
      }
      readCount += 1;
    } catch (err) {
      warnings.push(
        err instanceof Error && err.message.includes("PDF detected")
          ? "A PDF source was found, but its contents were not extracted. Treat it as an unverified document link, not a page that was read."
          : "Could not retrieve one webpage. It was not used as a source."
      );
    }
  }

  if (sources.length > 1) {
    await args.onProgress?.("comparing");
  }

  await args.onProgress?.("preparing_answer");

  const uniqueSources = dedupeSources(sources);
  const pagesReadUrls = pages.map((page) => page.uri);
  let evidenceContextBlock = "";

  let newsEvidence: import("../newsEvidence/types").NewsEvidenceContext | null = null;

  if (isNewsCapability(args.researchCapability ?? "live_web") || args.researchCapability === "live_web") {
    newsEvidence = buildNewsEvidencePackage({
      query: args.query,
      capability: args.researchCapability,
      sources: uniqueSources,
      pagesReadUrls,
      warnings,
      liveSearchUsed: Boolean(activeSearchProviderId && searchResults.length),
      retrievalFailed: uniqueSources.length === 0,
    });
    evidenceContextBlock = buildEvidenceContextBlock(newsEvidence);
    logNewsEvidenceEvent("research_evidence_built", {
      query: args.query.slice(0, 120),
      capability: args.researchCapability,
      evidenceCount: newsEvidence.contract.evidenceCount,
      independentSourceCount: newsEvidence.contract.independentSourceCount,
      articleRetrievedCount: newsEvidence.contract.articleRetrievedCount,
      retrievalFailed: newsEvidence.retrievalFailed,
    });
  }

  const contextBlock =
    uniqueSources.length || pages.length
      ? buildContextBlock(args.query, pages, searchResults, args.researchCapability)
      : searchProviders.length
        ? ""
        : "";

  const combinedContext = [contextBlock, evidenceContextBlock].filter(Boolean).join("\n\n");

  return {
    contextBlock: combinedContext,
    sources: uniqueSources,
    usedLiveSearch: Boolean(activeSearchProviderId && searchResults.length),
    providerId: activeSearchProviderId ?? (searchResults.length ? "gemini_grounding" : null),
    warnings,
    pagesReadUrls,
    evidenceContextBlock,
    newsEvidence,
  };
}

function dedupeSources(sources: LiveWebSource[]): LiveWebSource[] {
  const map = new Map<string, LiveWebSource>();
  for (const source of sources) {
    const key = canonicalSourceUri(source.uri);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, source);
      continue;
    }
    // Page metadata is independently retrieved and takes precedence over provider metadata.
    const preferIncoming = source.publicationDateSource === "page_metadata" &&
      existing.publicationDateSource !== "page_metadata";
    const preferred = preferIncoming ? source : existing;
    const fallback = preferIncoming ? existing : source;
    map.set(key, {
      ...fallback,
      ...preferred,
      ...(preferred.publishedAt
        ? { publishedAt: preferred.publishedAt, publicationDateSource: preferred.publicationDateSource }
        : fallback.publishedAt
          ? { publishedAt: fallback.publishedAt, publicationDateSource: fallback.publicationDateSource }
          : {}),
    });
  }
  return [...map.values()].slice(0, 8);
}

/**
 * When dedicated search returns nothing, Gemini grounding can still find sources.
 * Fold those into the evidence package before answer validation so a real
 * grounded reply is kept and a "check the news" hedge can be replaced.
 */
export function newsEvidenceWithGrounding(args: {
  query: string;
  capability?: ResearchCapabilityId;
  existing: import("../newsEvidence/types").NewsEvidenceContext | null;
  researchSources: LiveWebSource[];
  groundingSources: Array<{ title: string; uri: string }>;
}): {
  evidence: import("../newsEvidence/types").NewsEvidenceContext | null;
  sources: LiveWebSource[];
} {
  const merged = mergeLiveWebSources(args.researchSources, args.groundingSources);
  const failed =
    !args.existing ||
    args.existing.retrievalFailed ||
    args.existing.contract.evidenceCount === 0;
  if (!failed || merged.length === 0) {
    return {
      evidence: args.existing,
      sources: merged.length > 0 ? merged : args.researchSources,
    };
  }

  const capability =
    !args.capability || args.capability === "general" ? "current_news" : args.capability;
  return {
    evidence: buildNewsEvidencePackage({
      query: args.query,
      capability,
      sources: merged,
      pagesReadUrls: [],
      warnings: [],
      liveSearchUsed: true,
      retrievalFailed: false,
    }),
    sources: merged,
  };
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
  basis?: LiveWebResponseBasis;
  researchCapability?: string;
  checkedAt?: number;
  sourcesChecked?: number;
  verification?: import("./types").LiveWebVerificationMetadata;
  location?: import("./types").LiveWebLocationMetadata;
}): string {
  const basis: LiveWebResponseBasis =
    args.basis ??
    (args.usedLiveWeb && args.sources.length ? "live_web" : "knowledge");
  const metadata = {
    basis,
    sources: args.sources,
    providerId: args.providerId ?? undefined,
    researchCapability: args.researchCapability,
    checkedAt: args.checkedAt ?? (args.usedLiveWeb ? Date.now() : undefined),
    sourcesChecked: args.sourcesChecked ?? (args.sources.length || undefined),
    verification: args.verification,
    location: args.location,
  };
  return JSON.stringify(metadata);
}
