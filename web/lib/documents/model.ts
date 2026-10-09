import type { DocJson, DocumentTemplateKind, GigaDocument } from "@/lib/documents/types";
import { defaultPaper } from "@/lib/documents/types";
import {
  extractCleanDocumentContent,
  inferDocumentTitle,
} from "@/lib/chat/cleanDocumentExport";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `doc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Escape HTML for safe TipTap seed content. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineToHtml(escaped: string): string {
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/__([^_]+)__/g, "<u>$1</u>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

/** Convert markdown document body into sanitized HTML for TipTap. */
export function markdownToEditorHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inlineToHtml(escapeHtml(heading[2]))}</h${level}>`);
      i += 1;
      continue;
    }
    if (/^[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        items.push(`<li><p>${inlineToHtml(escapeHtml(lines[i].replace(/^[-*+]\s+/, "")))}</p></li>`);
        i += 1;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(`<li><p>${inlineToHtml(escapeHtml(lines[i].replace(/^\d+\.\s+/, "")))}</p></li>`);
        i += 1;
      }
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }
    if (line.trim() === "---" || line.trim() === "***") {
      out.push("<hr>");
      i += 1;
      continue;
    }
    if (line.trim() === "") {
      i += 1;
      continue;
    }
    const para: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("```") &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^[-*+]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }
    out.push(`<p>${inlineToHtml(escapeHtml(para.join(" ")))}</p>`);
  }
  return out.join("") || "<p></p>";
}

/** Best-effort TipTap JSON → markdown for AI regenerate / drafts. */
export function tipTapJsonToMarkdown(doc: DocJson | null | undefined): string {
  if (!doc?.content || !Array.isArray(doc.content)) return "";
  const parts: string[] = [];

  function inlineText(node: unknown): string {
    if (!node || typeof node !== "object") return "";
    const n = node as { type?: string; text?: string; marks?: Array<{ type: string }>; content?: unknown[] };
    if (n.type === "text") {
      let t = n.text ?? "";
      const marks = new Set((n.marks ?? []).map((m) => m.type));
      if (marks.has("code")) t = `\`${t}\``;
      if (marks.has("bold") || marks.has("strong")) t = `**${t}**`;
      if (marks.has("italic") || marks.has("em")) t = `*${t}*`;
      if (marks.has("underline")) t = `__${t}__`;
      return t;
    }
    if (Array.isArray(n.content)) return n.content.map(inlineText).join("");
    return "";
  }

  function walk(node: unknown): void {
    if (!node || typeof node !== "object") return;
    const n = node as {
      type?: string;
      attrs?: { level?: number };
      content?: unknown[];
    };
    switch (n.type) {
      case "heading": {
        const level = Math.min(3, Math.max(1, n.attrs?.level ?? 1));
        parts.push(`${"#".repeat(level)} ${inlineText(n)}`);
        parts.push("");
        break;
      }
      case "paragraph":
        parts.push(inlineText(n));
        parts.push("");
        break;
      case "bulletList":
        for (const item of n.content ?? []) {
          const li = item as { content?: unknown[] };
          const text = (li.content ?? []).map(inlineText).join("").trim();
          parts.push(`- ${text}`);
        }
        parts.push("");
        break;
      case "orderedList": {
        let i = 1;
        for (const item of n.content ?? []) {
          const li = item as { content?: unknown[] };
          const text = (li.content ?? []).map(inlineText).join("").trim();
          parts.push(`${i}. ${text}`);
          i += 1;
        }
        parts.push("");
        break;
      }
      case "horizontalRule":
        parts.push("---");
        parts.push("");
        break;
      case "hardBreak":
        parts.push("");
        break;
      default:
        if (Array.isArray(n.content)) n.content.forEach(walk);
    }
  }

  doc.content.forEach(walk);
  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function inferTemplateKind(title: string, markdown: string): DocumentTemplateKind {
  const hay = `${title}\n${markdown}`.toLowerCase();
  if (/\b(cv|resume|curriculum vitae)\b/.test(hay)) return "cv";
  if (/\b(application letter|cover letter)\b/.test(hay)) return "application-letter";
  if (/\bbusiness plan\b/.test(hay)) return "business-plan";
  if (/\blesson note/.test(hay)) return "lesson-notes";
  if (/\bmeeting minutes\b/.test(hay)) return "meeting-minutes";
  if (/\binvoice\b/.test(hay)) return "invoice";
  if (/\bproposal\b/.test(hay)) return "proposal";
  if (/\breport\b/.test(hay)) return "report";
  if (/\bmemo\b/.test(hay)) return "memo";
  return "generic";
}

/** Build a GigaDocument from AI / chat markdown. */
export function documentFromMarkdown(
  raw: string,
  options?: {
    title?: string;
    templateKind?: DocumentTemplateKind;
    paperSize?: "A4" | "A5";
    onePageFit?: boolean;
    id?: string;
  }
): GigaDocument {
  const markdown = extractCleanDocumentContent(raw);
  const title = options?.title?.trim() || inferDocumentTitle(markdown);
  const templateKind = options?.templateKind ?? inferTemplateKind(title, markdown);
  const paper = defaultPaper(options?.paperSize ?? (templateKind === "cv" ? "A4" : "A4"));
  if (options?.onePageFit != null) paper.onePageFit = options.onePageFit;
  else if (templateKind === "cv") paper.onePageFit = true;

  const now = Date.now();
  return {
    id: options?.id ?? newId(),
    title,
    templateKind,
    paper,
    content: { type: "doc", content: [] },
    markdown,
    createdAt: now,
    updatedAt: now,
    fitWarning: null,
  };
}

/** Rough character budget for one-page CV warnings (not deletion). */
export function evaluateOnePageFit(doc: GigaDocument): string | null {
  if (!doc.paper.onePageFit) return null;
  const text = doc.markdown.replace(/\s+/g, " ").trim();
  const limit = doc.paper.size === "A5" ? 1800 : 3200;
  if (text.length <= limit) return null;
  return `This ${doc.paper.size} one-page layout may be tight (${text.length.toLocaleString()} characters). Tighten wording or switch off one-page fit — content will not be deleted.`;
}

export function looksLikeDocumentContent(raw: string): boolean {
  const clean = extractCleanDocumentContent(raw);
  if (clean.length < 180) return false;
  const headings = (clean.match(/^#{1,3}\s+/gm) ?? []).length;
  const lists = (clean.match(/^[-*+\d]+\.?\s+/gm) ?? []).length;
  if (headings >= 2) return true;
  if (headings >= 1 && lists >= 3) return true;
  if (/\b(curriculum vitae|professional summary|cover letter|business plan|lesson notes)\b/i.test(clean)) {
    return true;
  }
  return clean.length >= 600 && lists >= 4;
}

export function slugFilename(title: string, ext: string): string {
  const slug = title
    .replace(/[^\w\s-]+/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 60);
  return `${slug || "Document"}.${ext}`;
}
