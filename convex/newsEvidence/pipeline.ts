import type { LiveWebSource } from "../liveWeb/types";
import type { ResearchCapabilityId } from "../researchCapabilities";
import {
  computeConfidenceScore,
  confidenceLabelFromScore,
  evidenceStatusFromSignals,
  legacyNewsLabelFromStatus,
} from "./confidence";
import { clusterByHeadline, countIndependentClusters } from "./duplicateCluster";
import { classifyNewsQuery, sourceMatchesRequestedCountry } from "./queryClassification";
import {
  lookupSourceByDomain,
  normalizeDomain,
  publisherForDomain,
  tierForDomain,
} from "./sourceRegistry";
import type {
  CountryNewsSection,
  NewsEvidenceContext,
  NewsResponseContract,
  NewsStory,
  ValidatedSource,
} from "./types";

const BREAKING_WINDOW_MS = 6 * 60 * 60 * 1000;

function domainFromUri(uri: string): string {
  try {
    return normalizeDomain(new URL(uri).hostname);
  } catch {
    return uri;
  }
}

function extractPublicationHint(text?: string): string | undefined {
  if (!text) return undefined;
  const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1];
  if (iso) return iso;
  const long = text.match(
    /\b(\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+20\d{2})\b/i
  )?.[1];
  return long;
}

function isRecentPublication(publishedAt: string | undefined, now = Date.now()): boolean {
  if (!publishedAt) return false;
  const parsed = Date.parse(publishedAt);
  if (Number.isNaN(parsed)) return false;
  return now - parsed <= BREAKING_WINDOW_MS;
}

export function validateLiveWebSource(args: {
  source: LiveWebSource;
  pagesReadUrls: Set<string>;
  now?: number;
}): ValidatedSource {
  const domain = args.source.domain || domainFromUri(args.source.uri);
  const articleRetrieved = args.pagesReadUrls.has(args.source.uri);
  const searchResultOnly = !articleRetrieved;
  const excerpt = args.source.excerpt?.trim();
  const publicationTimestamp =
    args.source.publishedAt ?? extractPublicationHint(excerpt) ?? extractPublicationHint(args.source.title);

  let extractionStatus: ValidatedSource["extractionStatus"] = "snippet_only";
  if (articleRetrieved) extractionStatus = excerpt && excerpt.length > 120 ? "success" : "partial";
  else if (!excerpt) extractionStatus = "failed";

  const articleContentValidated =
    articleRetrieved && Boolean(excerpt && excerpt.length >= 40);

  return {
    publisher: publisherForDomain(domain),
    title: args.source.title,
    url: args.source.uri,
    domain,
    tier: tierForDomain(domain),
    publicationTimestamp,
    retrievedAt: args.source.accessedAt ?? args.now ?? Date.now(),
    excerpt,
    articleRetrieved,
    searchResultOnly,
    articleContentValidated,
    extractionStatus,
  };
}

function breakingLabelForStory(
  story: Pick<NewsStory, "status" | "publishedAt">,
  classificationDeveloping: boolean,
  now = Date.now()
): NewsStory["breakingLabel"] {
  if (story.status === "INSUFFICIENT_EVIDENCE" || story.status === "UNVERIFIED") {
    return classificationDeveloping ? "DEVELOPING" : null;
  }
  if (isRecentPublication(story.publishedAt, now)) {
    return "BREAKING";
  }
  return classificationDeveloping ? "DEVELOPING" : null;
}

function buildStoryFromCluster(
  cluster: ValidatedSource[],
  classificationDeveloping: boolean,
  hasContradictions: boolean,
  retrievalFailed: boolean
): NewsStory {
  const primary = cluster[0];
  const independentCount = countIndependentClusters(cluster);
  const articleSources = cluster.filter((s) => s.articleRetrieved);
  const bestTier = Math.min(...cluster.map((s) => s.tier)) as ValidatedSource["tier"];
  const searchSnippetOnly = cluster.every((s) => s.searchResultOnly);

  const status = evidenceStatusFromSignals({
    independentArticleSources: countIndependentClusters(articleSources),
    bestTier,
    hasContradictions,
    retrievalFailed,
    searchSnippetOnly,
  });

  const confidenceScore = computeConfidenceScore({
    tier: bestTier,
    articleRetrieved: articleSources.length > 0,
    searchResultOnly: searchSnippetOnly,
    independentSourceCount: independentCount,
    hasPublicationDate: Boolean(primary.publicationTimestamp),
    isRecent: isRecentPublication(primary.publicationTimestamp),
    hasContradictions,
    isOfficial: bestTier === 1,
  });

  const confidenceLabel = confidenceLabelFromScore(confidenceScore);
  const confidenceReason =
    status === "INSUFFICIENT_EVIDENCE"
      ? "No accessible article evidence was retrieved."
      : status === "CORROBORATED"
        ? "Multiple independent sources report the same core story."
        : status === "OFFICIAL"
          ? "Supported by an official institutional source."
          : status === "REPORTED" && searchSnippetOnly
            ? "Only search snippets were available — full article text was not retrieved."
            : status === "REPORTED"
              ? "Reported by one credible outlet; independent confirmation is limited."
              : "Evidence supports this level of certainty.";

  const headline = primary.title;
  const summary =
    primary.excerpt?.trim() ||
    "Summary unavailable — open the source link for full details.";

  const claimText = headline.replace(/\s+/g, " ").trim().slice(0, 240);

  const story: NewsStory = {
    headline,
    summary,
    publishedAt: primary.publicationTimestamp,
    status,
    breakingLabel: null,
    confidenceScore,
    confidenceLabel,
    confidenceReason,
    claims: [
      {
        id: "claim-1",
        text: claimText,
        status,
        confidenceScore,
        confidenceLabel,
        supportingSourceUrls: cluster.map((s) => s.url),
        contradictingSourceUrls: [],
      },
    ],
    sources: cluster,
    citations: cluster.map((s) => s.url),
  };

  story.breakingLabel = breakingLabelForStory(story, classificationDeveloping);
  return story;
}

function displayConfidenceLabel(label: ReturnType<typeof confidenceLabelFromScore>): "High" | "Medium" | "Low" {
  if (label === "Very High" || label === "High") return "High";
  if (label === "Moderate") return "Medium";
  return "Low";
}

function summarizeCountrySection(args: {
  country: string;
  stories: NewsStory[];
  retrievalFailed: boolean;
  evidenceCount: number;
  warnings: string[];
}): CountryNewsSection {
  if (args.retrievalFailed || args.stories.length === 0) {
    return {
      country: args.country,
      stories: [],
      retrievalFailed: true,
      confidenceLabel: "Unavailable",
      confidenceReason: `Insufficient verified current sources were available for ${args.country}.`,
      evidenceCount: args.evidenceCount,
      warnings: args.warnings,
    };
  }

  const best = args.stories.reduce((top, story) =>
    story.confidenceScore > top.confidenceScore ? story : top
  );
  return {
    country: args.country,
    stories: args.stories,
    retrievalFailed: false,
    confidenceLabel: displayConfidenceLabel(best.confidenceLabel),
    confidenceReason: best.confidenceReason,
    evidenceCount: args.evidenceCount,
    warnings: args.warnings,
  };
}

function buildStoriesForSources(
  validated: ValidatedSource[],
  classificationDeveloping: boolean,
  retrievalFailed: boolean
): NewsStory[] {
  const sourceClusters = clusterByHeadline(validated, 0.55);
  return sourceClusters
    .slice(0, 4)
    .map((cluster) =>
      buildStoryFromCluster(cluster, classificationDeveloping, false, retrievalFailed)
    );
}

export function buildMultiCountryNewsEvidencePackage(args: {
  query: string;
  capability?: ResearchCapabilityId;
  countries: string[];
  sources: LiveWebSource[];
  pagesReadUrls: string[];
  warnings: string[];
  liveSearchUsed: boolean;
  countryWarnings?: Record<string, string[]>;
  now?: number;
}): NewsEvidenceContext {
  const now = args.now ?? Date.now();
  const classification = classifyNewsQuery(args.query);
  const pagesReadUrls = new Set(args.pagesReadUrls);
  const validatedAll = args.sources.map((source) =>
    validateLiveWebSource({ source, pagesReadUrls, now })
  );

  const countrySections: CountryNewsSection[] = args.countries.map((country) => {
    const scoped = validatedAll.filter((source) =>
      sourceMatchesRequestedCountry(
        {
          title: source.title,
          uri: source.url,
          domain: source.domain,
          excerpt: source.excerpt,
        },
        country
      )
    );
    const countryFailed =
      Boolean(args.countryWarnings?.[country]?.length) && scoped.length === 0;
    const stories = buildStoriesForSources(
      scoped,
      classification.developingStory,
      countryFailed || scoped.length === 0
    );
    return summarizeCountrySection({
      country,
      stories,
      retrievalFailed: countryFailed || scoped.length === 0,
      evidenceCount: scoped.length,
      warnings: args.countryWarnings?.[country] ?? [],
    });
  });

  const stories = countrySections.flatMap((section) => section.stories);
  const articleRetrievedCount = validatedAll.filter((s) => s.articleRetrieved).length;
  const independentSourceCount = countIndependentClusters(validatedAll);
  const anyCountryEvidence = countrySections.some(
    (section) => !section.retrievalFailed && section.stories.length > 0
  );
  const retrievalFailed = !anyCountryEvidence;

  const contract: NewsResponseContract = {
    query: args.query,
    classification: {
      ...classification,
      countries: args.countries,
    },
    location: args.countries.join(" / "),
    requestedTime: classification.requestedTime,
    stories,
    countrySections,
    retrievalTimestamp: now,
    evidenceCount: validatedAll.length,
    independentSourceCount,
    articleRetrievedCount,
    warnings: [...args.warnings],
    agreements: [],
    differences: [],
    missingInformation: [],
    contradictions: [],
  };

  for (const section of countrySections) {
    if (section.retrievalFailed) {
      contract.missingInformation.push(
        `${section.country}: I couldn't verify a sufficiently reliable current update from the available sources.`
      );
    }
  }

  if (retrievalFailed) {
    contract.warnings.push(
      "Evidence retrieval did not return usable sources for any requested country."
    );
  }

  return {
    contract,
    pagesReadUrls,
    liveSearchUsed: args.liveSearchUsed,
    retrievalFailed,
  };
}

export function buildNewsEvidencePackage(args: {
  query: string;
  capability?: ResearchCapabilityId;
  sources: LiveWebSource[];
  pagesReadUrls: string[];
  warnings: string[];
  liveSearchUsed: boolean;
  retrievalFailed?: boolean;
  now?: number;
}): NewsEvidenceContext {
  const now = args.now ?? Date.now();
  const classification = classifyNewsQuery(args.query);
  const pagesReadUrls = new Set(args.pagesReadUrls);

  const validated = args.sources.map((source) =>
    validateLiveWebSource({ source, pagesReadUrls, now })
  );

  const articleRetrievedCount = validated.filter((s) => s.articleRetrieved).length;
  const retrievalFailed =
    args.retrievalFailed ??
    (classification.requiresRetrieval && validated.length === 0 && !args.liveSearchUsed);

  const clusters = countIndependentClusters(validated);
  const independentSourceCount = clusters;

  const sourceClusters = clusterByHeadline(validated, 0.55);

  const stories = sourceClusters
    .slice(0, 6)
    .map((cluster) =>
      buildStoryFromCluster(
        cluster,
        classification.developingStory,
        false,
        retrievalFailed
      )
    );

  const contract: NewsResponseContract = {
    query: args.query,
    classification,
    location: classification.city ?? classification.country,
    requestedTime: classification.requestedTime,
    stories,
    retrievalTimestamp: now,
    evidenceCount: validated.length,
    independentSourceCount,
    articleRetrievedCount,
    warnings: [...args.warnings],
    agreements: [],
    differences: [],
    missingInformation: [],
    contradictions: [],
  };

  if (classification.comparisonRequested) {
    if (independentSourceCount <= 1) {
      contract.missingInformation.push(
        "Only one accessible report cluster was found, so a multi-source comparison is not currently possible."
      );
    } else {
      contract.agreements.push(
        "Multiple outlets are reporting on the same core story — see individual headlines for nuance."
      );
    }
  }

  if (retrievalFailed) {
    contract.warnings.push(
      "Evidence retrieval did not return usable sources for this query."
    );
  }

  return {
    contract,
    pagesReadUrls,
    liveSearchUsed: args.liveSearchUsed,
    retrievalFailed,
  };
}

export function buildEvidenceContextBlock(context: NewsEvidenceContext): string {
  const { contract } = context;
  const lines: string[] = [
    "NEWS EVIDENCE PACKAGE (structured — do not invent fields beyond this evidence):",
    `Query classification: country=${contract.classification.country ?? "unspecified"}, countries=${contract.classification.countries?.join(", ") ?? "none"}, topic=${contract.classification.topic ?? "general"}, requiresRetrieval=${contract.classification.requiresRetrieval}`,
    `Evidence count: ${contract.evidenceCount}; independent clusters: ${contract.independentSourceCount}; articles retrieved: ${contract.articleRetrievedCount}`,
  ];

  if (contract.warnings.length) {
    lines.push(`Warnings: ${contract.warnings.join(" | ")}`);
  }
  if (contract.missingInformation.length) {
    lines.push(`Missing: ${contract.missingInformation.join(" | ")}`);
  }

  if (contract.countrySections?.length) {
    lines.push(
      "",
      "Multi-country response rules:",
      "- Use separate ## Country sections in the user answer.",
      "- Include ### Confidence with High / Medium / Low per country (use package labels only).",
      "- If a country section has no stories, say evidence is insufficient for that country only.",
      "- Do not skip countries that have evidence because another country failed."
    );
    for (const section of contract.countrySections) {
      lines.push(
        "",
        `Country section: ${section.country}`,
        `- Confidence: ${section.confidenceLabel} — ${section.confidenceReason}`,
        `- Evidence count: ${section.evidenceCount}; retrievalFailed=${section.retrievalFailed}`
      );
      if (section.warnings.length) {
        lines.push(`- Country warnings: ${section.warnings.join(" | ")}`);
      }
      for (const [index, story] of section.stories.entries()) {
        lines.push(
          `  Story ${index + 1}: ${story.headline}`,
          `  Status: ${story.status} (${legacyNewsLabelFromStatus(story.status)})`,
          `  Confidence: ${story.confidenceLabel} — ${story.confidenceReason}`,
          `  Sources: ${story.sources.map((s) => `${s.publisher} ${s.url}`).join("; ")}`
        );
      }
    }
  }

  if (!contract.countrySections?.length) {
    for (const [index, story] of contract.stories.entries()) {
      lines.push(
        "",
        `Story ${index + 1}:`,
        `- Headline: ${story.headline}`,
        `- Status: ${story.status} (${legacyNewsLabelFromStatus(story.status)})`,
        `- Confidence: ${story.confidenceLabel} — ${story.confidenceReason}`,
        `- Breaking label: ${story.breakingLabel ?? "none"}`,
        `- Published: ${story.publishedAt ?? "unknown"}`,
        `- Sources: ${story.sources
          .map(
            (s) =>
              `${s.publisher} [tier ${s.tier}, articleRetrieved=${s.articleRetrieved}] ${s.url}`
          )
          .join("; ")}`
      );
    }
  }

  lines.push(
    "",
    "Response rules:",
    "- Generate the user answer ONLY from this evidence package and live web context.",
    "- Never label a story Verified/Official unless status supports it.",
    "- If status is INSUFFICIENT_EVIDENCE, say evidence is insufficient — do not invent headlines.",
    "- Use markdown links to the source URLs above.",
    "- For allegations in political/crime stories, use attributed wording (e.g. 'Police said…')."
  );

  return lines.join("\n");
}

export function publisherTierSummary(domain: string): string {
  const entry = lookupSourceByDomain(domain);
  if (!entry) return `Unknown publisher (${domain}) — tier 3 assumed`;
  return `${entry.publisher} — tier ${entry.tier}`;
}

export function logNewsEvidenceEvent(event: string, payload: Record<string, unknown>): void {
  console.log(
    JSON.stringify({
      scope: "news_evidence",
      event,
      at: Date.now(),
      ...payload,
    })
  );
}
