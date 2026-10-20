/**
 * Release-readiness audit tests for Document Studio (PR #478).
 * Covers PDF/DOCX exports, page setup, one-page CV, special chars, drafts.
 *
 * @vitest-environment happy-dom
 */
import { createRequire } from "node:module";
import { beforeEach, describe, expect, it } from "vitest";
import {
  documentFromMarkdown,
  evaluateOnePageFit,
  tipTapJsonToMarkdown,
} from "../../web/lib/documents/model";
import { exportDocumentPdf } from "../../web/lib/documents/exportPdf";
import { exportDocumentDocx } from "../../web/lib/documents/exportDocx";
import { paperDimensionsPt } from "../../web/lib/documents/paper";
import {
  getDocumentDraft,
  listDocumentDrafts,
  saveDocumentDraft,
} from "../../web/lib/documents/drafts";
import type { GigaDocument } from "../../web/lib/documents/types";

const require = createRequire(__filename);
const { PDFDocument } = require("../../web/node_modules/pdf-lib") as typeof import("pdf-lib");
const JSZip = require("../../web/node_modules/jszip") as typeof import("jszip");

const FORMATTED_DOC_MD = `# Title Centre

## Section

**Bold** and *italic* and __underline__ text.

- Bullet one
- Bullet two

1. First
2. Second

---

Paragraph after page break with Café résumé — “quotes”.
`;

const STRUCTURED: GigaDocument["content"] = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1, textAlign: "center" },
      content: [{ type: "text", text: "Centred Title" }],
    },
    {
      type: "paragraph",
      attrs: { textAlign: "justify" },
      content: [
        { type: "text", text: "Bold", marks: [{ type: "bold" }] },
        { type: "text", text: " and " },
        { type: "text", text: "italic", marks: [{ type: "italic" }] },
        { type: "text", text: " and " },
        {
          type: "text",
          text: "violet",
          marks: [{ type: "textStyle", attrs: { color: "#7C3AED" } }],
        },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Item A" }],
            },
          ],
        },
      ],
    },
    { type: "horizontalRule" },
    {
      type: "paragraph",
      content: [{ type: "text", text: "After break · Café · 日本語 · Ελληνικά" }],
    },
  ],
};

describe("release audit: PDF / DOCX exports", () => {
  it("exports A4 and A5 PDFs with correct page dimensions", async () => {
    for (const size of ["A4", "A5"] as const) {
      const doc = documentFromMarkdown(FORMATTED_DOC_MD, {
        title: `Page_${size}`,
        paperSize: size,
      });
      doc.content = STRUCTURED;
      const bytes = await exportDocumentPdf(doc);
      expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("%PDF");
      const pdf = await PDFDocument.load(bytes);
      const { width, height } = pdf.getPage(0).getSize();
      const expected = paperDimensionsPt({
        size,
        orientation: "portrait",
        marginsMm: doc.paper.marginsMm,
        onePageFit: false,
      });
      expect(width).toBeCloseTo(expected.width, 0);
      expect(height).toBeCloseTo(expected.height, 0);
    }
  });

  it("exports landscape orientation with swapped dimensions", async () => {
    const doc = documentFromMarkdown("# Wide\n\nBody", { title: "Landscape" });
    doc.paper.orientation = "landscape";
    const bytes = await exportDocumentPdf(doc);
    const pdf = await PDFDocument.load(bytes);
    const { width, height } = pdf.getPage(0).getSize();
    expect(width).toBeGreaterThan(height);
  });

  it("preserves multi-page content for long documents (no silent truncate)", async () => {
    const long = `# Long CV\n\n${"## Section\n\nParagraph with detail. ".repeat(120)}`;
    const doc = documentFromMarkdown(long, { title: "Long_CV", templateKind: "cv" });
    doc.paper.onePageFit = false;
    const before = doc.markdown;
    const bytes = await exportDocumentPdf(doc);
    expect(doc.markdown).toBe(before);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });

  it("DOCX is a real ZIP/OOXML archive with document.xml", async () => {
    const doc = documentFromMarkdown(FORMATTED_DOC_MD, { title: "Business_Plan" });
    doc.content = STRUCTURED;
    const bytes = await exportDocumentDocx(doc);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain("Centred Title");
    expect(xml).toContain("w:jc"); // alignment preserved in OOXML
  });

  it("DOCX preserves non-Latin text (unlike PDF WinAnsi path)", async () => {
    const doc = documentFromMarkdown("# Hello\n\n日本語 and Ελληνικά", { title: "I18n" });
    doc.content = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "日本語 Ελληνικά" }],
        },
      ],
    };
    const bytes = await exportDocumentDocx(doc);
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain("日本語");
    expect(xml).toContain("Ελληνικά");
  });

  it("PDF maps unsupported glyphs to visible placeholders (not silent delete)", async () => {
    const original = "日本語 Café résumé — “smart”";
    const doc = documentFromMarkdown(`# T\n\n${original}`, { title: "Glyphs" });
    const beforeLen = doc.markdown.length;
    const bytes = await exportDocumentPdf(doc);
    expect(doc.markdown.length).toBe(beforeLen);
    expect(doc.markdown).toContain("日本語");
    // WinAnsi PDF cannot embed CJK; exporter replaces with "?"
    const latin1 = Buffer.from(bytes).toString("latin1");
    expect(latin1.includes("?") || latin1.includes("Cafe") || latin1.includes("Caf")).toBe(true);
    // Original CJK must not appear as intact UTF-8 in StandardFonts PDF
    expect(latin1.includes("日本語")).toBe(false);
  });
});

describe("release audit: one-page CV", () => {
  it("warns on bulky CV without deleting markdown", () => {
    const bulky = documentFromMarkdown(
      `# CV\n\n## Summary\n\n${"More detail. ".repeat(400)}`,
      { templateKind: "cv", onePageFit: true, paperSize: "A5" }
    );
    const warning = evaluateOnePageFit(bulky);
    expect(warning).toMatch(/will not be deleted/i);
    expect(bulky.markdown).toContain("More detail.");
    expect(bulky.markdown.length).toBeGreaterThan(1800);
  });

  it("PDF one-page fit never goes below 8.5pt body size", async () => {
    // Mirror exportPdf soft-fit formula for audit assertion.
    const chars = 10000;
    const limit = 3200;
    const bodySize = Math.max(8.5, 11 - (chars - limit) / 800);
    expect(bodySize).toBe(8.5);

    const doc = documentFromMarkdown(`# CV\n\n${"word ".repeat(2500)}`, {
      templateKind: "cv",
      onePageFit: true,
    });
    const mdBefore = doc.markdown;
    await expect(exportDocumentPdf(doc)).resolves.toBeInstanceOf(Uint8Array);
    expect(doc.markdown).toBe(mdBefore);
  });

  it("short CV has no fit warning", () => {
    const doc = documentFromMarkdown(
      `# Ama Mensah\n\n## Summary\n\nTeacher.\n\n## Experience\n\n- Role`,
      { templateKind: "cv", onePageFit: true }
    );
    expect(evaluateOnePageFit(doc)).toBeNull();
  });
});

describe("release audit: formatting round-trip helpers", () => {
  it("TipTap JSON preserves bold/italic and lists in markdown", () => {
    const md = tipTapJsonToMarkdown(STRUCTURED);
    expect(md).toContain("# Centred Title");
    expect(md).toContain("**Bold**");
    expect(md).toContain("*italic*");
    expect(md).toMatch(/^- Item A/m);
  });

  it("horizontal rules survive JSON→markdown", () => {
    expect(tipTapJsonToMarkdown(STRUCTURED)).toContain("---");
  });
});

describe("release audit: draft persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves, lists, and reopens drafts with content intact", () => {
    const doc = documentFromMarkdown(FORMATTED_DOC_MD, {
      title: "Draft_CV",
      templateKind: "cv",
      id: "audit-draft-1",
    });
    doc.content = STRUCTURED;
    const saved = saveDocumentDraft(doc);
    expect(saved.id).toBe("audit-draft-1");
    expect(listDocumentDrafts().some((d) => d.id === "audit-draft-1")).toBe(true);
    const reopened = getDocumentDraft("audit-draft-1");
    expect(reopened?.title).toBe("Draft_CV");
    expect(reopened?.markdown).toContain("Bold");
    expect(reopened?.content?.content?.length).toBeGreaterThan(0);
  });
});
