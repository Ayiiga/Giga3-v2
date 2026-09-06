/** Shared live-web types — server-side only (no secrets). */

export type LiveWebProgressStage =
  | "searching"
  | "opening_source"
  | "reading"
  | "comparing"
  | "preparing_answer";

export type LiveWebMode = "research" | "actions";

export type WebSearchResult = {
  title: string;
  uri: string;
  snippet?: string;
  domain: string;
};

export type WebPageContent = {
  uri: string;
  title: string;
  domain: string;
  text: string;
  excerpt: string;
  accessedAt: number;
};

export type LiveWebSource = {
  title: string;
  uri: string;
  domain: string;
  excerpt?: string;
  accessedAt: number;
};

export type LiveWebResponseBasis =
  | "live_web"
  | "knowledge"
  | "current_news"
  | "fact_checked"
  | "device_location";

export type LiveWebVerificationMetadata = {
  verdict:
    | "confirmed"
    | "partially_true"
    | "misleading"
    | "false"
    | "insufficient_evidence"
    | "developing";
  confidence: "high" | "medium" | "low";
  summary?: string;
};

export type LiveWebLocationMetadata = {
  formattedAddress: string;
  accuracyMeters?: number;
  mapUrl?: string;
  permissionGranted: boolean;
};

export type LiveWebMessageMetadata = {
  basis: LiveWebResponseBasis;
  sources: LiveWebSource[];
  providerId?: string;
  researchCapability?: string;
  checkedAt?: number;
  sourcesChecked?: number;
  verification?: LiveWebVerificationMetadata;
  location?: LiveWebLocationMetadata;
  webActionsLog?: Array<{
    action: string;
    timestamp: number;
    status: "proposed" | "confirmed" | "rejected" | "blocked" | "unsupported";
  }>;
};

export type WebResearchResult = {
  contextBlock: string;
  sources: LiveWebSource[];
  usedLiveSearch: boolean;
  providerId: string | null;
  warnings: string[];
};

export interface WebSearchProvider {
  readonly id: string;
  search(query: string, options: { maxResults: number; timeoutMs: number }): Promise<WebSearchResult[]>;
}

export interface WebPageReader {
  read(url: string, options: { timeoutMs: number; maxBytes: number }): Promise<WebPageContent>;
}

export type WebActionKind =
  | "navigate"
  | "click"
  | "submit_form"
  | "purchase"
  | "delete_account"
  | "login"
  | "unknown";

export type WebActionProposal = {
  kind: WebActionKind;
  description: string;
  targetUrl?: string;
  requiresConfirmation: boolean;
  blockedReason?: string;
};
