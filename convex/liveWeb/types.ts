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

export type LiveWebMessageMetadata = {
  basis: "live_web" | "knowledge";
  sources: LiveWebSource[];
  providerId?: string;
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
