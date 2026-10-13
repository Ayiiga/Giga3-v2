import { describe, expect, it } from "vitest";
import {
  documentFromMarkdown,
  evaluateOnePageFit,
  looksLikeDocumentContent,
  markdownToEditorHtml,
  slugFilename,
  tipTapJsonToMarkdown,
} from "../../web/lib/documents/model";
import { exportDocumentPdf } from "../../web/lib/documents/exportPdf";
import { exportDocumentDocx } from "../../web/lib/documents/exportDocx";
import { createDocumentFromTemplate } from "../../web/lib/documents/templates";
import {
  isDocumentCreationRequest,
  isDocumentFollowUpRequest,
} from "../../web/lib/documents/intent";
import { paperDimensionsPt } from "../../web/lib/documents/paper";

const SAMPLE_CV = `# Professional CV

## Contact
- Ama Mensah · ama@example.com · Accra

## Professional summary
Experienced basic school teacher with BECE preparation expertise.

## Experience
### Classroom Teacher — Accra Academy Basic (2020 – Present)
- Improved literacy outcomes for P4 learners
- Led after-school reading club

## Education
### Diploma in Basic Education — University of Education
`;

describe("document model", () => {
  it("detects document-like content and creation intents", () => {
    expect(looksLikeDocumentContent(SAMPLE_CV)).toBe(true);
    expect(looksLikeDocumentContent("Sure, here is a short tip.")).toBe(false);
    expect(isDocumentCreationRequest("Create a CV for a teaching job")).toBe(true);
    expect(isDocumentFollowUpRequest("make it one page and export as Word")).toBe(true);
  });

  it("builds documents with A4/A5 and one-page fit warnings", () => {
    const doc = documentFromMarkdown(SAMPLE_CV, { templateKind: "cv", onePageFit: true });
    expect(doc.paper.size).toBe("A4");
    expect(doc.paper.onePageFit).toBe(true);
    expect(evaluateOnePageFit(doc)).toBeNull();

    const bulky = documentFromMarkdown(`${SAMPLE_CV}\n\n${"More detail. ".repeat(400)}`, {
      templateKind: "cv",
      onePageFit: true,
      paperSize: "A5",
    });
    expect(evaluateOnePageFit(bulky)).toMatch(/one-page layout may be tight/i);
  });

  it("round-trips markdown through editor HTML helpers", () => {
    const html = markdownToEditorHtml(SAMPLE_CV);
    expect(html).toContain("<h1>");
    expect(html).toContain("<ul>");
    const json = {
      type: "doc" as const,
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Professional CV" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello", marks: [{ type: "bold" }] }],
        },
      ],
    };
    expect(tipTapJsonToMarkdown(json)).toContain("# Professional CV");
    expect(tipTapJsonToMarkdown(json)).toContain("**Hello**");
  });

  it("creates professional templates", () => {
    const cv = createDocumentFromTemplate("cv", "Professional CV (A4)");
    expect(cv.title).toMatch(/CV/i);
    expect(cv.paper.onePageFit).toBe(true);
    expect(slugFilename("Business Plan", "docx")).toBe("Business_Plan.docx");
  });
});

describe("document exports", () => {
  it("generates a valid PDF with A4 page size", async () => {
    const doc = documentFromMarkdown(SAMPLE_CV, { title: "Professional_CV", templateKind: "cv" });
    const bytes = await exportDocumentPdf(doc);
    expect(bytes.byteLength).toBeGreaterThan(500);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("%PDF");
    const dims = paperDimensionsPt(doc.paper);
    expect(dims.width).toBeGreaterThan(500);
    expect(dims.height).toBeGreaterThan(700);
  });

  it("generates a real OOXML docx archive", async () => {
    const doc = documentFromMarkdown(SAMPLE_CV, { title: "Professional_CV", templateKind: "cv" });
    // Seed structured content so DOCX exporter uses TipTap path.
    doc.content = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Professional CV" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Accra" }],
                },
              ],
            },
          ],
        },
      ],
    };
    const bytes = await exportDocumentDocx(doc);
    expect(bytes.byteLength).toBeGreaterThan(1000);
    // ZIP / OOXML magic
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it("handles special characters without throwing", async () => {
    const doc = documentFromMarkdown(
      `# Rapport\n\nCafé résumé — “quotes” & <tags> · 100%\n\n- Élève\n- 日本語`,
      { title: "Special" }
    );
    await expect(exportDocumentPdf(doc)).resolves.toBeInstanceOf(Uint8Array);
    await expect(exportDocumentDocx(doc)).resolves.toBeInstanceOf(Uint8Array);
  });
});
