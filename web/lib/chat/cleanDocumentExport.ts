/**
 * Clean document export — content model derived from assistant markdown,
 * not scraped from the chat UI. No Giga3 branding or conversational wrappers.
 */

import { GIGA3_ATTRIBUTION_LINE } from "@/lib/share/giga3Attribution";

export type CleanDocumentExportModel = {
  title: string;
  markdown: string;
};

const INTRO_LINE_RE =
  /^(?:sure!?[,.]?|certainly!?[,.]?|of course!?[,.]?|absolutely!?[,.]?|great (?:question|topic)!?[,.]?|here(?:'s| is)|below (?:is|are)|please find|i(?:'ve| have) (?:prepared|drafted|written|created|put together|compiled)|let me (?:share|provide|give you|know)|as requested[,!.]?|thank you for(?: your)? (?:question|request)[,.]?|i'd be happy to|happy to help)\b/i;

const OUTRO_LINE_RE =
  /^(?:i hope this helps|let me know if|feel free to|if you (?:need|want|would like)|please let me know|don't hesitate|would you like me to|shall i|happy to (?:help|revise|assist|make)|let me know whether)\b/i;

const META_LINE_RE =
  /^(?:verification note:|confidence:|sources checked:|checked at:|mode:|basis:|research basis:)\s/i;

const STRUCTURAL_LINE_RE =
  /^(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|\|.+\||!\[)/;

function isStructuralLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return STRUCTURAL_LINE_RE.test(trimmed);
}

function isConversationalIntroLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (isStructuralLine(trimmed)) return false;
  if (INTRO_LINE_RE.test(trimmed)) return true;
  if (trimmed.length <= 140 && /[.!?]$/.test(trimmed) && !trimmed.includes(":")) {
    return /^(?:here|this|the following|below|above)\b/i.test(trimmed);
  }
  return false;
}

function isConversationalOutroLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (isStructuralLine(trimmed)) return false;
  if (OUTRO_LINE_RE.test(trimmed)) return true;
  if (META_LINE_RE.test(trimmed)) return true;
  if (trimmed.includes(GIGA3_ATTRIBUTION_LINE)) return true;
  if (/made with giga3 ai/i.test(trimmed)) return true;
  return false;
}

function stripAttributionBlocks(text: string): string {
  return text
    .split("\n")
    .filter((line) => !/made with giga3 ai/i.test(line.trim()))
    .join("\n")
    .replace(new RegExp(GIGA3_ATTRIBUTION_LINE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "")
    .trim();
}

function stripLeadingWrappers(lines: string[]): string[] {
  const out = [...lines];
  let stripped = 0;
  while (out.length > 0 && stripped < 4) {
    const first = out[0]?.trim() ?? "";
    if (!first) {
      out.shift();
      stripped += 1;
      continue;
    }
    if (isStructuralLine(first)) break;
    if (!isConversationalIntroLine(first)) break;
    out.shift();
    stripped += 1;
    while (out.length > 0 && !out[0]?.trim()) out.shift();
  }
  return out;
}

function stripTrailingWrappers(lines: string[]): string[] {
  const out = [...lines];
  let stripped = 0;
  while (out.length > 0 && stripped < 4) {
    const last = out[out.length - 1]?.trim() ?? "";
    if (!last) {
      out.pop();
      stripped += 1;
      continue;
    }
    if (isStructuralLine(last)) break;
    if (!isConversationalOutroLine(last)) break;
    out.pop();
    stripped += 1;
    while (out.length > 0 && !out[out.length - 1]?.trim()) out.pop();
  }
  return out;
}

/** Extract the main document body from an assistant reply. */
export function extractCleanDocumentContent(raw: string): string {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  let text = stripAttributionBlocks(normalized);
  let lines = text.split("\n");
  lines = stripLeadingWrappers(lines);
  lines = stripTrailingWrappers(lines);
  text = lines.join("\n").trim();

  return text;
}

/** Document title from first markdown H1, else a neutral default. */
export function inferDocumentTitle(markdown: string): string {
  const line = markdown
    .split("\n")
    .map((l) => l.trim())
    .find((l) => /^#\s+/.test(l));
  if (line) {
    return line.replace(/^#\s+/, "").replace(/\*\*/g, "").trim().slice(0, 120);
  }
  return "Document";
}

export function buildCleanDocumentExportModel(
  raw: string,
  titleOverride?: string
): CleanDocumentExportModel {
  const markdown = extractCleanDocumentContent(raw);
  const title = titleOverride?.trim() || inferDocumentTitle(markdown);
  return { title, markdown };
}

export function documentExportFilename(title: string, ext: string): string {
  const slug = title
    .replace(/[^\w\s-]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .toLowerCase();
  return `${slug || "document"}.${ext}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMarkdownToHtml(escaped: string): string {
  return escaped
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, src) => {
      const safeSrc = escapeHtml(String(src).trim());
      const safeAlt = escapeHtml(String(alt));
      return `<img src="${safeSrc}" alt="${safeAlt}" style="max-width:100%;height:auto;margin:12px 0;border-radius:6px" />`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" style="color:inherit;text-decoration:underline">$1</a>'
    );
}

function parseMarkdownTable(lines: string[], start: number): { html: string; next: number } | null {
  if (start + 1 >= lines.length) return null;
  const header = lines[start];
  const divider = lines[start + 1];
  if (!header.includes("|") || !divider.trim().match(/^\|?[\s:-]+\|[\s|:-]+$/)) return null;

  const splitRow = (row: string) =>
    row
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());

  const headerCells = splitRow(header);
  const bodyRows: string[][] = [];
  let i = start + 2;
  while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
    bodyRows.push(splitRow(lines[i]));
    i += 1;
  }

  const thead = `<tr>${headerCells
    .map((c) => `<th style="border:1px solid #d4d4d8;padding:8px;text-align:left">${inlineMarkdownToHtml(escapeHtml(c))}</th>`)
    .join("")}</tr>`;
  const tbody = bodyRows
    .map(
      (row) =>
        `<tr>${row
          .map(
            (c) =>
              `<td style="border:1px solid #d4d4d8;padding:8px;vertical-align:top">${inlineMarkdownToHtml(
                escapeHtml(c)
              )}</td>`
          )
          .join("")}</tr>`
    )
    .join("");

  return {
    html: `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`,
    next: i,
  };
}

/** Markdown → printable HTML preserving structure (no app chrome). */
export function markdownToCleanDocumentHtml(markdown: string): string {
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
      out.push(
        `<pre style="background:#f4f4f5;padding:12px;border-radius:8px;overflow-x:auto;font-size:12px;white-space:pre-wrap"><code>${escapeHtml(
          code.join("\n")
        )}</code></pre>`
      );
      continue;
    }

    const table = parseMarkdownTable(lines, i);
    if (table) {
      out.push(table.html);
      i = table.next;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = Math.min(heading[1].length, 6);
      const size = level === 1 ? 24 : level === 2 ? 20 : level === 3 ? 17 : 15;
      out.push(
        `<h${level} style="font-size:${size}px;margin:20px 0 10px;font-weight:700;line-height:1.3">${inlineMarkdownToHtml(
          escapeHtml(heading[2])
        )}</h${level}>`
      );
      i += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      out.push(
        `<blockquote style="margin:12px 0;padding:10px 14px;border-left:3px solid #a1a1aa;color:#3f3f46">${inlineMarkdownToHtml(
          escapeHtml(quote.join("\n"))
        ).replace(/\n/g, "<br>")}</blockquote>`
      );
      continue;
    }

    if (/^[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        items.push(
          `<li>${inlineMarkdownToHtml(escapeHtml(lines[i].replace(/^[-*+]\s+/, "")))}</li>`
        );
        i += 1;
      }
      out.push(`<ul style="margin:10px 0 10px 22px;line-height:1.6">${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(
          `<li>${inlineMarkdownToHtml(escapeHtml(lines[i].replace(/^\d+\.\s+/, "")))}</li>`
        );
        i += 1;
      }
      out.push(`<ol style="margin:10px 0 10px 22px;line-height:1.6">${items.join("")}</ol>`);
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
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^[-*+]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !(lines[i].includes("|") && i + 1 < lines.length && /^\|?[\s:-]+\|/.test(lines[i + 1] ?? ""))
    ) {
      para.push(lines[i]);
      i += 1;
    }
    out.push(
      `<p style="margin:10px 0;line-height:1.65">${inlineMarkdownToHtml(escapeHtml(para.join("\n"))).replace(/\n/g, "<br>")}</p>`
    );
  }

  return out.join("\n");
}

const DOCUMENT_BODY_STYLE =
  "font-family:Georgia,'Times New Roman',serif;color:#18181b;max-width:720px;margin:0 auto;padding:40px 32px;font-size:15px;line-height:1.65";

export function buildCleanDocumentPrintHtml(model: CleanDocumentExportModel): string {
  const bodyHtml = markdownToCleanDocumentHtml(model.markdown);
  const title = escapeHtml(model.title);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body style="${DOCUMENT_BODY_STYLE}">${bodyHtml}<script>window.onload=function(){setTimeout(function(){window.print();},400);}</script></body></html>`;
}

export function buildCleanDocumentDocxHtml(model: CleanDocumentExportModel): string {
  const bodyHtml = markdownToCleanDocumentHtml(model.markdown);
  return `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body style="font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5">${bodyHtml}</body></html>`;
}
