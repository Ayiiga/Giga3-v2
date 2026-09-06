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
  publishedAt?: string;
};

export type LiveWebResponseBasis =
  | "live_web"
  | "knowledge"
  | "current_news"
  | "fact_checked"
  | "device_location";

export type VerificationVerdict =
  | "confirmed"
  | "partially_true"
  | "misleading"
  | "false"
  | "insufficient_evidence"
  | "developing";

export type LiveWebVerificationMetadata = {
  verdict: VerificationVerdict;
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

const VALID_BASIS = new Set<LiveWebResponseBasis>([
  "live_web",
  "knowledge",
  "current_news",
  "fact_checked",
  "device_location",
]);

export function parseLiveWebMetadata(
  metadataJson?: string | null
): LiveWebMessageMetadata | null {
  if (!metadataJson) return null;
  try {
    const parsed = JSON.parse(metadataJson) as LiveWebMessageMetadata;
    if (!parsed || typeof parsed !== "object") return null;
    if (!VALID_BASIS.has(parsed.basis)) return null;
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
  switch (metadata.basis) {
    case "live_web":
      return "🌐 Live Web research";
    case "current_news":
      return "📰 Current News";
    case "fact_checked":
      return "✅ Fact checked";
    case "device_location":
      return "📍 Device location";
    case "knowledge":
    default:
      return "Based on Giga3 AI knowledge.";
  }
}

export function responseBasisDetail(metadata: LiveWebMessageMetadata | null): string | null {
  if (!metadata) return null;
  const checked = metadata.checkedAt
    ? `Checked: ${formatAccessTime(metadata.checkedAt)}`
    : null;
  const sourceCount =
    metadata.sourcesChecked ?? metadata.sources.length
      ? `Sources checked: ${metadata.sourcesChecked ?? metadata.sources.length}`
      : null;
  return [sourceCount, checked].filter(Boolean).join(" · ") || null;
}

export const VERDICT_LABELS: Record<
  VerificationVerdict,
  { emoji: string; label: string }
> = {
  confirmed: { emoji: "🟢", label: "CONFIRMED" },
  partially_true: { emoji: "🟡", label: "PARTIALLY TRUE" },
  misleading: { emoji: "🟠", label: "MISLEADING" },
  false: { emoji: "🔴", label: "FALSE" },
  insufficient_evidence: { emoji: "⚪", label: "INSUFFICIENT EVIDENCE" },
  developing: { emoji: "🔵", label: "DEVELOPING" },
};

export function verificationVerdictLabel(
  verdict: VerificationVerdict | undefined
): string | null {
  if (!verdict) return null;
  const entry = VERDICT_LABELS[verdict];
  return `${entry.emoji} ${entry.label}`;
}
