/** Shared live-web client types (mirrors server metadata shape). */

export type LiveWebProgressStage =
  | "searching"
  | "opening_source"
  | "reading"
  | "comparing"
  | "preparing_answer";

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

export function parseLiveWebMetadata(
  metadataJson?: string | null
): LiveWebMessageMetadata | null {
  if (!metadataJson) return null;
  try {
    const parsed = JSON.parse(metadataJson) as LiveWebMessageMetadata;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.basis !== "live_web" && parsed.basis !== "knowledge") return null;
    if (!Array.isArray(parsed.sources)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function formatAccessTime(accessedAt: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(accessedAt));
  } catch {
    return new Date(accessedAt).toLocaleString();
  }
}

export function responseBasisLabel(metadata: LiveWebMessageMetadata | null): string | null {
  if (!metadata) return null;
  return metadata.basis === "live_web"
    ? "Based on live web information."
    : "Based on Giga3 AI knowledge.";
}
