import type { LiveWebSource } from "../liveWeb/types";
import {
  detectFactCheckIntent,
  detectNewsRetrievalIntent,
  isNewsCapability,
  type ResearchCapabilityId,
} from "../researchCapabilities";
import type { NewsQueryClassification } from "./types";
import type { NewsResponseContract, NewsStory, ValidatedSource } from "./types";

const REPUTABLE_SECONDARY = new Set([
  "reuters.com",
  "bbc.com",
  "bbc.co.uk",
  "apnews.com",
  "bloomberg.com",
  "aljazeera.com",
]);

const REFERENCE_DOMAINS = new Set([
  "britannica.com",
  "wikipedia.org",
  "en.wikipedia.org",
]);

const PUBLISHER_DISPLAY_NAMES: Record<string, string> = {
  "britannica.com": "Britannica",
  "reuters.com": "Reuters",
  "bbc.com": "BBC",
  "bbc.co.uk": "BBC",
  "apnews.com": "AP",
  "bloomberg.com": "Bloomberg",
  "aljazeera.com": "Al Jazeera",
  "wikipedia.org": "Wikipedia",
  "en.wikipedia.org": "Wikipedia",
};

function publisherDisplayName(source: ValidatedSource): string {
  if (source.publisher && !source.publisher.includes(".")) {
    return source.publisher;
  }
  return PUBLISHER_DISPLAY_NAMES[source.domain] ?? source.publisher ?? source.domain;
}

const MAX_SOURCES_PER_STORY = 4;
const MAX_TOTAL_SOURCES = 6;

function normalizePublisherKey(source: ValidatedSource): string {
  return (source.publisher || source.domain).trim().toLowerCase();
}

function sourceSortScore(source: ValidatedSource, classification: NewsQueryClassification): number {
  let score = 0;
  if (source.tier === 1) score += 100;
  else if (source.tier === 2) score += 70;
  else if (source.tier === 3) score += 40;

  if (REPUTABLE_SECONDARY.has(source.domain)) score += 15;
  if (REFERENCE_DOMAINS.has(source.domain)) score += 5;
  if (source.articleRetrieved) score += 25;

  if (classification.requestedTime !== "unspecified" && source.publicationTimestamp) {
    const parsed = Date.parse(source.publicationTimestamp);
    if (!Number.isNaN(parsed)) score += parsed / 1_000_000_000;
  }

  return score;
}

/** Prefer official/reputable sources; dedupe by publisher; cap list length. */
export function selectPresentationSources(
  sources: ValidatedSource[],
  classification: NewsQueryClassification,
  limit = MAX_SOURCES_PER_STORY
): ValidatedSource[] {
  const byPublisher = new Map<string, ValidatedSource>();
  for (const source of sources) {
    const key = normalizePublisherKey(source);
    const existing = byPublisher.get(key);
    if (!existing || sourceSortScore(source, classification) > sourceSortScore(existing, classification)) {
      byPublisher.set(key, source);
    }
  }
  return [...byPublisher.values()]
    .sort((a, b) => sourceSortScore(b, classification) - sourceSortScore(a, classification))
    .slice(0, limit);
}

export function contractHasSnippetOnlyEvidence(contract: NewsResponseContract): boolean {
  return contract.stories.some((story) =>
    story.sources.length > 0 && story.sources.every((s) => s.searchResultOnly)
  );
}

export function snippetOnlyEvidenceNote(): string {
  return "Evidence note: Some sources were available only as search snippets, so details based on those sources should be treated with caution.";
}

function cleanSummaryText(story: NewsStory): string {
  const raw = story.summary?.trim() ?? "";
  if (!raw || /^summary unavailable/i.test(raw)) return "";
  return raw.replace(/\s+/g, " ").slice(0, 420);
}

export function renderCleanStorySummary(
  story: NewsStory,
  classification: NewsQueryClassification
): string {
  const lines: string[] = [];
  const headline = story.headline?.trim();
  const summary = cleanSummaryText(story);

  if (headline) {
    lines.push(headline);
  }
  if (summary) {
    if (lines.length) lines.push("");
    lines.push(summary);
  }

  const sources = selectPresentationSources(story.sources, classification);
  if (sources.length) {
    lines.push("", "**Sources**");
    for (const source of sources) {
      const date =
        source.publicationTimestamp && classification.requestedTime !== "unspecified"
          ? ` — ${source.publicationTimestamp}`
          : "";
      lines.push(`- [${publisherDisplayName(source)}](${source.url})${date}`);
    }
  }

  return lines.join("\n").trim();
}

export function renderCleanNewsContractSummary(contract: NewsResponseContract): string {
  if (!contract.stories.length) {
    return "";
  }

  const blocks = contract.stories
    .slice(0, 3)
    .map((story) => renderCleanStorySummary(story, contract.classification))
    .filter(Boolean);

  let body = blocks.join("\n\n");
  if (contractHasSnippetOnlyEvidence(contract)) {
    body = `${body}\n\n${snippetOnlyEvidenceNote()}`;
  }
  return body.trim();
}

const INTERNAL_LINE_PATTERNS: RegExp[] = [
  /^━+$/,
  /^Confidence:\s*.+$/i,
  /^Why:\s*.+$/i,
  /^Breaking label:\s*.+$/i,
  /^Status:\s*.+$/i,
  /^\[S\d+\]\s*.+$/i,
  /^\[P\d+\]\s*.+$/i,
  /^Sources:\s*$/i,
  /^Story \d+:\s*$/i,
  /^providerId\b/i,
  /^usedLiveSearch\b/i,
  /articleRetrieved\s*=/i,
  /tier \d+/i,
  /^🔴 BREAKING\s*\/\s*🟡/i,
  /^[🔵🟢🟡🟠⚪]\s*(Official|Verified|Corroborated|Reported|Unverified|Conflicting|Insufficient)/i,
];

/** True when the user explicitly asked for links, citations, or a source list. */
export function userRequestedSources(query: string): boolean {
  const q = query.trim();
  if (!q) return false;
  return /\b(sources?|citations?|references?|bibliography|where did you get|show (me )?(the )?(links?|urls?)|cite (your )?sources?|with links?|include links?|give me links?|list (the )?sources?|provide sources?)\b/i.test(
    q
  );
}

/** Full source cards — only for news, fact-check, or explicit user request. */
export function shouldShowFullSourceList(
  query: string,
  capability?: ResearchCapabilityId
): boolean {
  if (userRequestedSources(query)) return true;
  if (detectFactCheckIntent(query)) return true;
  if (detectNewsRetrievalIntent(query)) return true;
  if (capability === "fact_check" || capability === "verify_image") return true;
  if (capability && isNewsCapability(capability)) return true;
  return false;
}

const SOURCE_SUMMARY_TITLE = "Web research summary";

/** One compact attribution card when the user did not ask for a source list. */
export function buildSourceSummaryCard(
  sources: LiveWebSource[]
): LiveWebSource | null {
  if (!sources.length) return null;
  const domains = [
    ...new Set(sources.map((s) => s.domain.replace(/^www\./i, ""))),
  ].slice(0, 3);
  const count = sources.length;
  const domainList = domains.join(", ");
  const suffix =
    count > domains.length
      ? ` (+${count - domains.length} more)`
      : count > 1
        ? ` (${count} sites)`
        : "";
  return {
    title: SOURCE_SUMMARY_TITLE,
    uri: sources[0]!.uri,
    domain: sources[0]!.domain,
    excerpt: `Based on ${domainList}${suffix}. Ask for sources if you want full links.`,
    accessedAt: sources[0]!.accessedAt ?? Date.now(),
  };
}

export function isSourceSummaryCard(source: LiveWebSource): boolean {
  return source.title === SOURCE_SUMMARY_TITLE;
}

/** Limit source cards shown under chat — full list only when appropriate. */
export function prepareSourcesForUserPresentation(
  sources: LiveWebSource[],
  query: string,
  capability?: ResearchCapabilityId
): LiveWebSource[] {
  const deduped = sources.filter(
    (source, index, all) => all.findIndex((row) => row.uri === source.uri) === index
  );
  if (!deduped.length) return [];
  if (shouldShowFullSourceList(query, capability)) {
    return deduped.slice(0, 5);
  }
  // User did not ask — omit source cards (research still informs the answer).
  return [];
}

export function stripSourcesSectionFromAnswer(answer: string): string {
  return answer
    .replace(/\n+(\*\*Sources\*\*|#{1,3}\s*Sources)\s*[\s\S]*$/i, "")
    .trim();
}

/** Repair cramped scholarship/program lists into readable markdown with spacing. */
export function normalizeStructuredCatalogAnswer(answer: string): string {
  let text = answer.trim();
  if (!text) return text;

  text = text.replace(/\n*Made with Giga3 AI[\s\S]*$/i, "").trim();
  text = text.replace(/\n*###\s*Giga3 AI[\s\S]*$/i, "").trim();

  text = text.replace(/(?<!\n)(\d+\.\s+\*\*)/g, "\n\n$1");

  text = text.replace(
    /(\*\*[^*\n]+\*\*)\s+-\s+\*\*(Funding|Eligibility|Deadline|Deadlines|Study mode|Study Mode|Application|Application link|Application Link|Requirements|Duration|Location|Benefits|Coverage):\*\*/gi,
    "$1\n   - **$2:**"
  );

  text = text.replace(
    /\s+-\s+(\*\*(?:Funding|Eligibility|Deadline|Deadlines|Study mode|Study Mode|Application|Application link|Application Link|Requirements|Duration|Location|Benefits|Coverage):\*\*)/gi,
    "\n   - $1"
  );

  return text.replace(/\n{3,}/g, "\n\n").trim();
}

/** Hide raw API/JSON blobs from source cards shown under chat replies. */
export function sanitizeLiveWebSourceExcerpt(
  excerpt: string | undefined
): string | undefined {
  if (!excerpt) return excerpt;
  const trimmed = excerpt.trim();
  if (!trimmed) return undefined;
  if (/^[\[{]/.test(trimmed)) {
    const nameMatch = trimmed.match(/['"]name['"]\s*:\s*['"]([^'"]+)['"]/i);
    if (nameMatch) {
      return `Result for ${nameMatch[1]}.`;
    }
    return undefined;
  }
  return trimmed.replace(/\s+/g, " ").slice(0, 280);
}

/** Remove internal retrieval labels from user-visible assistant text. */
export function sanitizeLiveWebUserAnswer(answer: string): string {
  let text = answer.trim();
  if (!text) return text;

  text = text.replace(/\*\*(Reported|Developing|Unverified|Verified|Official|Corroborated|Disputed|Breaking)\*\*\s*[—–-]\s*/gi, "");
  text = text.replace(/\n+#{1,3}\s*(Verification|Evidence|Confidence)\s*[\s\S]*$/i, "");
  text = text.replace(/\s*\[S\d+\]/g, "");

  const kept: string[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      kept.push("");
      continue;
    }
    if (INTERNAL_LINE_PATTERNS.some((re) => re.test(trimmed))) continue;
    kept.push(line);
  }

  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function sortSourcesForRecency(
  sources: ValidatedSource[],
  classification: NewsQueryClassification
): ValidatedSource[] {
  if (classification.requestedTime === "unspecified") return sources;
  return [...sources].sort((a, b) => {
    const aTime = a.publicationTimestamp ? Date.parse(a.publicationTimestamp) : 0;
    const bTime = b.publicationTimestamp ? Date.parse(b.publicationTimestamp) : 0;
    const aValid = !Number.isNaN(aTime);
    const bValid = !Number.isNaN(bTime);
    if (aValid && bValid) return bTime - aTime;
    if (aValid) return -1;
    if (bValid) return 1;
    return sourceSortScore(b, classification) - sourceSortScore(a, classification);
  });
}
