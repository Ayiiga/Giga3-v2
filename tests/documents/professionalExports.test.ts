import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { documentFromMarkdown, evaluateOnePageFit } from "../../web/lib/documents/model";
import { exportDocumentPdf } from "../../web/lib/documents/exportPdf";
import { exportDocumentDocx } from "../../web/lib/documents/exportDocx";
import { exportDocumentPptx, slidesFromDocument } from "../../web/lib/documents/exportPptx";
import { passportPhotoBytes } from "../../web/lib/documents/profilePhoto";
import { createDocumentFromTemplate } from "../../web/lib/documents/templates";
import { inferKindFromRequest, isDocumentCreationRequest, isDocumentFollowUpRequest } from "../../web/lib/documents/intent";

const require = createRequire(__filename);
const { PDFDocument } = require("../../web/node_modules/pdf-lib") as typeof import("pdf-lib");
const JSZip = require("../../web/node_modules/jszip") as typeof import("jszip");
const PHOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAADAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD1KiiimI//2Q==";

describe("professional document requests", () => {
  it("supports CV one/two-page targets without truncating text", () => {
    const one = createDocumentFromTemplate("cv", "Professional CV (A4)");
    const two = createDocumentFromTemplate("cv", "Experienced CV (2 pages)");
    expect(one.paper.pageTarget).toBe(1);
    expect(two.paper.pageTarget).toBe(2);
    expect(two.paper.onePageFit).toBe(false);
    two.markdown += "\n" + "Confirmed experience. ".repeat(450);
    expect(evaluateOnePageFit(two)).toMatch(/two-page layout may be tight/);
    expect(two.markdown).toContain("Confirmed experience.");
  });

  it("recognizes books, research, theses and slides without guessing citations", () => {
    expect(inferKindFromRequest("Create a thesis")).toBe("thesis");
    expect(inferKindFromRequest("Write a research paper")).toBe("research-paper");
    expect(inferKindFromRequest("Prepare a book manuscript")).toBe("book");
    expect(inferKindFromRequest("Make a presentation")).toBe("presentation");
    expect(isDocumentCreationRequest("Create a PowerPoint presentation")).toBe(true);
    expect(isDocumentFollowUpRequest("make it two pages")).toBe(true);
  });
});

describe("optional CV passport photograph", () => {
  it("accepts local JPEG only", () => {
    expect(passportPhotoBytes(PHOTO).length).toBeGreaterThan(500);
    expect(() => passportPhotoBytes("data:image/svg+xml;base64,PHN2Zz4=")).toThrow();
    expect(() => passportPhotoBytes("https://example.com/photo.jpg")).toThrow();
  });

  it("embeds the selected portrait in PDF and Word without altering CV text", async () => {
    const doc = documentFromMarkdown("# Ama Mensah\n\n## Experience\n\nTeacher", { templateKind: "cv" });
    doc.profilePhotoDataUrl = PHOTO;
    const original = doc.markdown;
    const pdfBytes = await exportDocumentPdf(doc);
    const pdf = await PDFDocument.load(pdfBytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
    const docxBytes = await exportDocumentDocx(doc);
    const zip = await JSZip.loadAsync(docxBytes);
    expect(Object.keys(zip.files).some((name) => name.startsWith("word/media/"))).toBe(true);
    expect(doc.markdown).toBe(original);
  });
});

describe("editable slides export", () => {
  it("creates continuation slides instead of dropping text", () => {
    const doc = documentFromMarkdown("# Research Brief\n\n## Findings\n" + "- Evidence.\n".repeat(15), { templateKind: "presentation" });
    const slides = slidesFromDocument(doc);
    expect(slides.length).toBe(4);
    expect(slides[3].lines).toHaveLength(3);
  });

  it("creates PowerPoint OOXML with all slide relationships and escaped text", async () => {
    const doc = documentFromMarkdown("# Presentation\n\n## Results\n\n- Revenue & growth\n- Lessons <learned>", { templateKind: "presentation" });
    const bytes = await exportDocumentPptx(doc);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    const zip = await JSZip.loadAsync(bytes);
    for (const path of ["[Content_Types].xml", "ppt/presentation.xml", "ppt/slideMasters/slideMaster1.xml", "ppt/theme/theme1.xml", "ppt/slides/slide1.xml", "ppt/slides/slide2.xml"]) {
      expect(zip.file(path), path).not.toBeNull();
    }
    const slideXml = await zip.file("ppt/slides/slide2.xml")!.async("string");
    expect(slideXml).toContain("Revenue &amp; growth");
    expect(slideXml).toContain("Lessons &lt;learned&gt;");
  });
});
