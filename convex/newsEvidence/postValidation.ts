import {
  evidenceStatusEmoji,
  evidenceStatusLabel,
  legacyNewsLabelFromStatus,
} from "./confidence";
import type { NewsEvidenceContext, NewsResponseContract } from "./types";

const VERIFIED_LABEL_RE = /\*\*(Verified|Official|Corroborated)\*\*/gi;
const BREAKING_LABEL_RE = /\*\*Breaking\*\*/gi;
const CANT_VERIFY_RE =
  /\b(can'?t|cannot)\s+(confidently\s+)?verify\b/i;

export function insufficientEvidenceFallback(query: string): string {
  return `I couldn't retrieve enough current evidence to give you reliable news on that request right now. I won't invent or label unverified stories as current news.

Request: "${query.slice(0, 180)}"

You can:
- Retry in a moment
- Ask about a specific topic or outlet
- Paste a link to a report you want checked`;
}

export function downgradeUnsupportedNewsLabels(
  answer: string,
  contract: NewsResponseContract
): string {
  let updated = answer;

  const maxAllowedStatus = contract.stories.reduce<
    "VERIFIED" | "CORROBORATED" | "REPORTED" | "INSUFFICIENT"
  >((best, story) => {
    if (story.status === "INSUFFICIENT_EVIDENCE" || story.status === "UNVERIFIED") {
      return best;
    }
    if (story.status === "OFFICIAL" || story.status === "VERIFIED") return "VERIFIED";
    if (story.status === "CORROBORATED" && best !== "VERIFIED") return "CORROBORATED";
    if (story.status === "REPORTED" && best === "INSUFFICIENT") return "REPORTED";
    return best;
  }, "INSUFFICIENT");

  const allowedLegacy =
    maxAllowedStatus === "VERIFIED"
      ? new Set(["Verified", "Official", "Corroborated"])
      : maxAllowedStatus === "CORROBORATED"
        ? new Set(["Corroborated", "Developing", "Reported"])
        : maxAllowedStatus === "REPORTED"
          ? new Set(["Developing", "Reported", "Unverified"])
          : new Set(["Unverified"]);

  updated = updated.replace(
    /\*\*(Verified|Official|Corroborated|Reported|Developing|Unverified|Disputed|Breaking)\*\*/gi,
    (match, label: string) => {
      const normalized =
        label.toLowerCase() === "breaking"
          ? label
          : label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
      if (normalized === "Breaking") {
        const anyBreaking = contract.stories.some((s) => s.breakingLabel === "BREAKING");
        return anyBreaking ? "**Breaking**" : "**Developing**";
      }
      if (allowedLegacy.has(normalized)) return `**${normalized}**`;
      if (contract.evidenceCount === 0) return "**Unverified**";
      return `**${legacyNewsLabelFromStatus(
        contract.stories[0]?.status ?? "INSUFFICIENT_EVIDENCE"
      )}**`;
    }
  );

  return updated;
}

export function enforceNewsEvidenceIntegrity(args: {
  answer: string;
  query: string;
  evidence: NewsEvidenceContext | null;
  isNewsQuery: boolean;
}): { content: string; flags: string[] } {
  const flags: string[] = [];
  let content = args.answer.trim();

  if (!args.isNewsQuery || !args.evidence) {
    return { content, flags };
  }

  const { contract, retrievalFailed } = args.evidence;

  if (
    (retrievalFailed || contract.evidenceCount === 0) &&
    contract.classification.requiresRetrieval
  ) {
    flags.push("news_insufficient_evidence");
    return { content: insufficientEvidenceFallback(args.query), flags };
  }

  const hadVerified = VERIFIED_LABEL_RE.test(content);
  const hadCantVerify = CANT_VERIFY_RE.test(content);

  content = downgradeUnsupportedNewsLabels(content, contract);

  if (hadCantVerify && (hadVerified || /\*\*(Verified|Official|Corroborated|Developing|Reported)\*\*/i.test(content))) {
    content = content.replace(CANT_VERIFY_RE, "Evidence is limited for this request —");
    flags.push("news_contradiction_resolved");
  }

  if (hadVerified && contract.articleRetrievedCount === 0) {
    flags.push("news_verified_downgraded");
  }

  if (BREAKING_LABEL_RE.test(content) && !contract.stories.some((s) => s.breakingLabel === "BREAKING")) {
    content = content.replace(BREAKING_LABEL_RE, "**Developing**");
    flags.push("breaking_label_downgraded");
  }

  return { content, flags };
}

export function renderNewsStoryCard(story: NewsResponseContract["stories"][number]): string {
  const emoji = evidenceStatusEmoji(story.status);
  const label = evidenceStatusLabel(story.status);
  const breaking =
    story.breakingLabel === "BREAKING"
      ? "🔴 BREAKING"
      : story.breakingLabel === "DEVELOPING"
        ? "🟡 DEVELOPING"
        : null;

  const sourceLines = story.sources
    .slice(0, 3)
    .map(
      (s) =>
        `• [${s.publisher}](${s.url})${s.publicationTimestamp ? ` — ${s.publicationTimestamp}` : ""}`
    )
    .join("\n");

  return [
    "━━━━━━━━━━━━━━━━━━",
    breaking ? `${breaking} / ${emoji} ${label}` : `${emoji} ${label}`,
    "",
    story.headline,
    "",
    story.summary,
    "",
    "Sources:",
    sourceLines || "• No accessible source link",
    "",
    `Confidence: ${story.confidenceLabel}`,
    `Why: ${story.confidenceReason}`,
    "━━━━━━━━━━━━━━━━━━",
  ].join("\n");
}

export function renderNewsContractSummary(contract: NewsResponseContract): string {
  if (!contract.stories.length) {
    return insufficientEvidenceFallback(contract.query);
  }
  return contract.stories.map(renderNewsStoryCard).join("\n\n");
}
