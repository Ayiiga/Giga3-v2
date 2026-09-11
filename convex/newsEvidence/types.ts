import type { ConfidenceLabel, EvidenceStatus } from "./confidence";
import type { SourceTier } from "./sourceRegistry";

export type { ConfidenceLabel, EvidenceStatus };

export type ValidatedSource = {
  publisher: string;
  title: string;
  url: string;
  domain: string;
  tier: SourceTier;
  publicationTimestamp?: string;
  updatedAt?: string;
  author?: string;
  retrievedAt: number;
  excerpt?: string;
  articleRetrieved: boolean;
  searchResultOnly: boolean;
  articleContentValidated: boolean;
  extractionStatus: "success" | "partial" | "failed" | "snippet_only";
};

export type NewsClaim = {
  id: string;
  text: string;
  status: EvidenceStatus;
  confidenceScore: number;
  confidenceLabel: ConfidenceLabel;
  supportingSourceUrls: string[];
  contradictingSourceUrls: string[];
};

export type NewsStory = {
  headline: string;
  summary: string;
  publishedAt?: string;
  updatedAt?: string;
  status: EvidenceStatus;
  breakingLabel: "BREAKING" | "DEVELOPING" | null;
  confidenceScore: number;
  confidenceLabel: ConfidenceLabel;
  confidenceReason: string;
  claims: NewsClaim[];
  sources: ValidatedSource[];
  citations: string[];
};

export type NewsQueryClassification = {
  country?: string;
  region?: string;
  city?: string;
  topic?: string;
  requestedTime?: "today" | "latest" | "breaking" | "historical" | "unspecified";
  requiresRetrieval: boolean;
  verificationRequested: boolean;
  comparisonRequested: boolean;
  developingStory: boolean;
};

export type NewsResponseContract = {
  query: string;
  classification: NewsQueryClassification;
  location?: string;
  requestedTime?: string;
  stories: NewsStory[];
  retrievalTimestamp: number;
  evidenceCount: number;
  independentSourceCount: number;
  articleRetrievedCount: number;
  warnings: string[];
  agreements: string[];
  differences: string[];
  missingInformation: string[];
  contradictions: string[];
};

export type NewsEvidenceContext = {
  contract: NewsResponseContract;
  pagesReadUrls: Set<string>;
  liveSearchUsed: boolean;
  retrievalFailed: boolean;
};
