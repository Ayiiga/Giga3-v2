import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { DocJson, GigaDocument } from "@/lib/documents/types";
import { DOC_TEXT_COLORS } from "@/lib/documents/types";
import { mmToPt, paperDimensionsPt } from "@/lib/documents/paper";
import { tipTapJsonToMarkdown } from "@/lib/documents/model";
import { sanitizeForPdfExport } from "@/lib/documents/pdfUnicode";

type Rgb = { r: number; g: number; b: number };

/** WinAnsi-safe text for StandardFonts. UI must warn before PDF export when substitutions occur. */
function toWinAnsiSafe(text: string): string {
  return sanitizeForPdfExport(text).text;
}

function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = Number.parseInt(full, 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

type Run = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  fontSize?: number;
};

type Block =
  | { kind: "heading"; level: number; runs: Run[]; align?: string }
  | { kind: "paragraph"; runs: Run[]; align?: string }
  | { kind: "listItem"; ordered: boolean; index: number; runs: Run[] }
  | { kind: "hr" };

function collectRuns(node: unknown, inherited: Partial<Run> = {}): Run[] {
  if (!node || typeof node !== "object") return [];
  const n = node as {
    type?: string;
    text?: string;
    marks?: Array<{ type: string; attrs?: { color?: string } }>;
    content?: unknown[];
  };
  if (n.type === "text") {
    const marks = n.marks ?? [];
    const run: Run = {
      text: toWinAnsiSafe(n.text ?? ""),
      bold: inherited.bold || marks.some((m) => m.type === "bold"),
      italic: inherited.italic || marks.some((m) => m.type === "italic"),
      underline: inherited.underline || marks.some((m) => m.type === "underline"),
      color:
        inherited.color ||
        marks.find((m) => m.type === "textStyle")?.attrs?.color ||
        undefined,
      fontSize: inherited.fontSize,
    };
    return run.text ? [run] : [];
  }
  if (n.type === "hardBreak") return [{ text: "\n", ...inherited }];
  const next = { ...inherited };
  if (Array.isArray(n.content)) {
    return n.content.flatMap((child) => collectRuns(child, next));
  }
  return [];
}

function blocksFromJson(doc: DocJson | null | undefined): Block[] {
  const blocks: Block[] = [];
  if (!doc?.content || !Array.isArray(doc.content)) return blocks;

  function walk(node: unknown): void {
    if (!node || typeof node !== "object") return;
    const n = node as {
      type?: string;
      attrs?: { level?: number; textAlign?: string };
      content?: unknown[];
    };
    if (n.type === "heading") {
      blocks.push({
        kind: "heading",
        level: n.attrs?.level ?? 1,
        runs: collectRuns(n),
        align: n.attrs?.textAlign,
      });
      return;
    }
    if (n.type === "paragraph") {
      blocks.push({ kind: "paragraph", runs: collectRuns(n), align: n.attrs?.textAlign });
      return;
    }
    if (n.type === "bulletList") {
      for (const item of n.content ?? []) {
        blocks.push({ kind: "listItem", ordered: false, index: 0, runs: collectRuns(item) });
      }
      return;
    }
    if (n.type === "orderedList") {
      let i = 1;
      for (const item of n.content ?? []) {
        blocks.push({ kind: "listItem", ordered: true, index: i, runs: collectRuns(item) });
        i += 1;
      }
      return;
    }
    if (n.type === "horizontalRule") {
      blocks.push({ kind: "hr" });
      return;
    }
    if (Array.isArray(n.content)) n.content.forEach(walk);
  }

  doc.content.forEach(walk);
  return blocks;
}

function wrapRuns(
  runs: Run[],
  maxWidth: number,
  baseSize: number,
  fonts: { regular: PDFFont; bold: PDFFont; italic: PDFFont; boldItalic: PDFFont }
): Array<Array<Run & { width: number; size: number }>> {
  const lines: Array<Array<Run & { width: number; size: number }>> = [[]];
  let lineWidth = 0;

  const measure = (run: Run, size: number) => {
    const font =
      run.bold && run.italic
        ? fonts.boldItalic
        : run.bold
          ? fonts.bold
          : run.italic
            ? fonts.italic
            : fonts.regular;
    return font.widthOfTextAtSize(run.text, size);
  };

  for (const run of runs) {
    const size = run.fontSize ?? baseSize;
    const words = run.text.split(/(\s+)/);
    for (const word of words) {
      if (!word) continue;
      if (word === "\n") {
        lines.push([]);
        lineWidth = 0;
        continue;
      }
      const w = measure({ ...run, text: word }, size);
      if (lineWidth + w > maxWidth && lines[lines.length - 1]!.length > 0) {
        lines.push([]);
        lineWidth = 0;
        if (/^\s+$/.test(word)) continue;
      }
      lines[lines.length - 1]!.push({ ...run, text: word, width: w, size });
      lineWidth += w;
    }
  }
  return lines.filter((line) => line.length > 0 || lines.length === 1);
}

/**
 * Build a real multi-page PDF from the structured document (pdf-lib).
 * Preserves paper size, margins, typography marks, lists, and colours.
 */
export async function exportDocumentPdf(doc: GigaDocument): Promise<Uint8Array> {
  const content =
    doc.content?.content && doc.content.content.length > 0
      ? doc.content
      : null;

  // Prefer structured TipTap JSON; fall back to markdown→paragraphs.
  let blocks = blocksFromJson(content);
  if (blocks.length === 0) {
    const md = doc.markdown || tipTapJsonToMarkdown(doc.content);
    blocks = md
      .split(/\n{2,}/)
      .filter(Boolean)
      .map((p) => {
        if (p.startsWith("# "))
          return { kind: "heading" as const, level: 1, runs: [{ text: toWinAnsiSafe(p.slice(2)) }] };
        if (p.startsWith("## "))
          return { kind: "heading" as const, level: 2, runs: [{ text: toWinAnsiSafe(p.slice(3)) }] };
        if (p.startsWith("### "))
          return { kind: "heading" as const, level: 3, runs: [{ text: toWinAnsiSafe(p.slice(4)) }] };
        return {
          kind: "paragraph" as const,
          runs: [{ text: toWinAnsiSafe(p.replace(/\n/g, " ")) }],
        };
      });
  }

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const italic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const boldItalic = await pdf.embedFont(StandardFonts.TimesRomanBoldItalic);
  const fonts = { regular, bold, italic, boldItalic };

  const pageSize = paperDimensionsPt(doc.paper);
  const margin = {
    top: mmToPt(doc.paper.marginsMm.top),
    right: mmToPt(doc.paper.marginsMm.right),
    bottom: mmToPt(doc.paper.marginsMm.bottom),
    left: mmToPt(doc.paper.marginsMm.left),
  };
  const contentWidth = pageSize.width - margin.left - margin.right;

  // Soft one-page fit: scale body size slightly, never delete.
  let bodySize = 11;
  if (doc.paper.onePageFit) {
    const chars = (doc.markdown || "").length;
    const limit = doc.paper.size === "A5" ? 1800 : 3200;
    if (chars > limit) bodySize = Math.max(8.5, 11 - (chars - limit) / 800);
  }

  let page: PDFPage = pdf.addPage([pageSize.width, pageSize.height]);
  let y = pageSize.height - margin.top;
  let pageIndex = 1;

  const newPage = () => {
    // Footer page number on previous page
    page.drawText(String(pageIndex), {
      x: pageSize.width / 2 - 4,
      y: margin.bottom / 2,
      size: 9,
      font: regular,
      color: rgb(0.4, 0.4, 0.45),
    });
    pageIndex += 1;
    page = pdf.addPage([pageSize.width, pageSize.height]);
    y = pageSize.height - margin.top;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < margin.bottom) newPage();
  };

  const drawLines = (
    lines: Array<Array<Run & { width: number; size: number }>>,
    align: string | undefined,
    gapAfter: number
  ) => {
    for (const line of lines) {
      const lineW = line.reduce((s, r) => s + r.width, 0);
      let x = margin.left;
      if (align === "center") x = margin.left + (contentWidth - lineW) / 2;
      else if (align === "right") x = margin.left + contentWidth - lineW;
      const size = line[0]?.size ?? bodySize;
      ensureSpace(size * 1.35);
      for (const run of line) {
        const font =
          run.bold && run.italic
            ? boldItalic
            : run.bold
              ? bold
              : run.italic
                ? italic
                : regular;
        const colorHex =
          run.color && Object.values(DOC_TEXT_COLORS).includes(run.color)
            ? run.color
            : run.color?.startsWith("#")
              ? run.color
              : DOC_TEXT_COLORS.black;
        const c = hexToRgb(colorHex || DOC_TEXT_COLORS.black);
        page.drawText(run.text, {
          x,
          y: y - size,
          size: run.size,
          font,
          color: rgb(c.r, c.g, c.b),
        });
        if (run.underline) {
          page.drawLine({
            start: { x, y: y - size - 1 },
            end: { x: x + run.width, y: y - size - 1 },
            thickness: 0.6,
            color: rgb(c.r, c.g, c.b),
          });
        }
        x += run.width;
      }
      y -= size * 1.35;
    }
    y -= gapAfter;
  };

  for (const block of blocks) {
    if (block.kind === "hr") {
      ensureSpace(12);
      page.drawLine({
        start: { x: margin.left, y },
        end: { x: margin.left + contentWidth, y },
        thickness: 0.8,
        color: rgb(0.7, 0.7, 0.75),
      });
      y -= 14;
      continue;
    }
    if (block.kind === "heading") {
      const size = block.level === 1 ? bodySize + 7 : block.level === 2 ? bodySize + 4 : bodySize + 2;
      const runs = block.runs.map((r) => ({ ...r, bold: true, fontSize: size }));
      drawLines(wrapRuns(runs, contentWidth, size, fonts), block.align, 8);
      continue;
    }
    if (block.kind === "listItem") {
      const bullet = block.ordered ? `${block.index}. ` : "- ";
      const prefixW = regular.widthOfTextAtSize(bullet, bodySize);
      const runs = [{ text: bullet, bold: true }, ...block.runs];
      const lines = wrapRuns(runs, contentWidth - 4, bodySize, fonts);
      // indent subsequent wrapped lines
      drawLines(lines, "left", 4);
      void prefixW;
      continue;
    }
    drawLines(wrapRuns(block.runs, contentWidth, bodySize, fonts), block.align, 6);
  }

  // Footer on last page
  page.drawText(String(pageIndex), {
    x: pageSize.width / 2 - 4,
    y: margin.bottom / 2,
    size: 9,
    font: regular,
    color: rgb(0.4, 0.4, 0.45),
  });

  return pdf.save();
}
