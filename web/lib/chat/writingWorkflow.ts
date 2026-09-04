import type { AiModeId } from "@/lib/aiRouter";
import type { UiMessage } from "@/components/chat/MessageList";
import {
  getDocumentTemplate,
  type DocumentTemplateId,
} from "@/lib/chat/documentTemplates";
import type { GigaModelId } from "@/lib/chat/gigaModels";
import { normalizeMessageContent } from "@/lib/chat/chatContentFormat";
import { GIGA3_ATTRIBUTION_LINE } from "@/lib/share/giga3Attribution";

/** Primary long-form writing templates surfaced on empty chat. */
export const WRITING_QUICK_START: {
  id: DocumentTemplateId;
  label: string;
}[] = [
  { id: "book-writing", label: "Book" },
  { id: "essay", label: "Essay" },
  { id: "thesis", label: "Thesis" },
  { id: "research-paper", label: "Research" },
];

const TEMPLATE_MODE_MAP: Partial<Record<DocumentTemplateId, AiModeId>> = {
  "book-writing": "book",
  essay: "university",
  thesis: "university",
  "research-paper": "research",
  report: "research",
  "business-plan": "resume",
  proposal: "resume",
  "cover-letter": "resume",
  resume: "resume",
  presentation: "social",
  "content-creation": "social",
};

const TEMPLATE_MODEL_TIER_MAP: Partial<Record<DocumentTemplateId, GigaModelId>> = {
  "book-writing": "smart",
  essay: "smart",
  thesis: "smart",
  "research-paper": "smart",
  report: "smart",
};

const LIVE_WEB_TEMPLATE_IDS = new Set<DocumentTemplateId>([
  "thesis",
  "research-paper",
  "report",
]);

const WRITING_MODES = new Set<AiModeId>(["book", "research", "university"]);

export function writingModeForTemplate(
  templateId: DocumentTemplateId
): AiModeId | undefined {
  return TEMPLATE_MODE_MAP[templateId];
}

export function modelTierForTemplate(
  templateId: DocumentTemplateId
): GigaModelId | undefined {
  return TEMPLATE_MODEL_TIER_MAP[templateId];
}

export function shouldSuggestLiveWebForTemplate(
  templateId: DocumentTemplateId
): boolean {
  return LIVE_WEB_TEMPLATE_IDS.has(templateId);
}

export function shouldSuggestLiveWebForMode(mode: AiModeId): boolean {
  return mode === "research" || mode === "university";
}

export function liveWebSuggestionMessage(): string {
  return "Tip: Turn on Live Web in the composer for cited research and up-to-date sources.";
}

export function templateInsertNotice(templateId: DocumentTemplateId): string | null {
  const template = getDocumentTemplate(templateId);
  if (!template) return null;

  const mode = writingModeForTemplate(templateId);
  const modeLabel =
    mode === "book"
      ? "Book Writer"
      : mode === "research"
        ? "GigaResearch"
        : mode === "university"
          ? "University"
          : null;

  const parts: string[] = [];
  if (modeLabel) {
    parts.push(`${modeLabel} mode is active for ${template.title}.`);
  }
  if (shouldSuggestLiveWebForTemplate(templateId)) {
    parts.push(liveWebSuggestionMessage());
  }
  return parts.length ? parts.join(" ") : null;
}

export function isWritingMode(mode: AiModeId): boolean {
  return WRITING_MODES.has(mode);
}

export function conversationLooksLikeManuscript(messages: UiMessage[]): boolean {
  const assistant = messages.filter((m) => m.role === "assistant");
  if (assistant.length < 2) return false;

  const totalChars = assistant.reduce(
    (sum, m) => sum + normalizeMessageContent(m.content).length,
    0
  );

  const hasChapterHeading = assistant.some((m) =>
    /^(#{1,3}\s+)?(chapter\s+\d+|part\s+\d+|abstract|introduction|literature review|methodology|conclusion)\b/im.test(
      normalizeMessageContent(m.content)
    )
  );

  return hasChapterHeading || totalChars >= 4000;
}

export function formatManuscriptMarkdown(
  messages: UiMessage[],
  meta?: { title?: string }
): string {
  const sections = messages
    .filter((m) => m.role === "assistant")
    .map((m) => normalizeMessageContent(m.content))
    .filter((content) => content.length >= 80);

  if (sections.length === 0) return "";

  const title = meta?.title?.trim() || "Giga3 AI — Manuscript";
  const lines: string[] = [`# ${title}`, "", `*Exported ${new Date().toISOString()}*`, ""];

  for (const section of sections) {
    lines.push(section, "", "---", "");
  }

  lines.push(GIGA3_ATTRIBUTION_LINE, "");
  return lines.join("\n").trim();
}

export function manuscriptExportFilename(title?: string): string {
  const base = (title?.trim() || "giga3-manuscript")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 48)
    .toLowerCase();
  return `${base || "giga3-manuscript"}.md`;
}
