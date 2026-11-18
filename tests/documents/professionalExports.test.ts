import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { documentFromMarkdown, evaluateOnePageFit } from "../../web/lib/documents/model";
import { exportDocumentPdf } from "../../web/lib/documents/exportPdf";
import { exportDocumentDocx } from "../../web/lib/documents/exportDocx";
import { exportDocumentPptx, slidesFromDocument } from "../../web/lib/documents/exportPptx";
import { signatureImageBytes } from "../../web/lib/documents/signature";
import { passportPhotoBytes } from "../../web/lib/documents/profilePhoto";
import { cvAppearance, CV_LAYOUTS, type CvLayout } from "../../web/lib/documents/cvLayouts";
import { createDocumentFromTemplate } from "../../web/lib/documents/templates";
import { inferKindFromRequest, isDocumentCreationRequest, isDocumentFollowUpRequest } from "../../web/lib/documents/intent";

const require = createRequire(__filename);
const { PDFDocument } = require("../../web/node_modules/pdf-lib") as typeof import("pdf-lib");
const JSZip = require("../../web/node_modules/jszip") as typeof import("jszip");
const PHOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/wAALCAABAAEBAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APQK/9k=";

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
    expect(passportPhotoBytes(PHOTO).length).toBeGreaterThan(300);
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

describe("Android document quality regressions", () => {
  it("retains independent bullet paragraphs from Markdown-only CVs in Word", async () => {
    const doc = documentFromMarkdown(
      "# Ama Mensah\n\n## Skills\n- Communication\n- Classroom management\n- Teamwork\n\n## Education\nDiploma in Education",
      { templateKind: "cv" }
    );
    expect(doc.content.content).toEqual([]);
    const bytes = await exportDocumentDocx(doc);
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain("Communication");
    expect(xml).toContain("Classroom management");
    expect(xml).toContain("Teamwork");
    expect((xml.match(/<w:numPr>/g) ?? []).length).toBeGreaterThanOrEqual(3);
    const pdf = await PDFDocument.load(await exportDocumentPdf(doc));
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it("keeps long-form academic documents unrestricted by CV page targets", async () => {
    for (const kind of ["book", "research-paper", "thesis", "presentation"] as const) {
      const doc = createDocumentFromTemplate(kind);
      expect(doc.templateKind).toBe(kind);
      expect(doc.paper.pageTarget).toBeUndefined();
    }
    const long = documentFromMarkdown(
      "# Thesis\n\n" + "## Chapter\n\n" + "An original academic paragraph. ".repeat(3000),
      { templateKind: "thesis" }
    );
    const pdf = await PDFDocument.load(await exportDocumentPdf(long));
    expect(pdf.getPageCount()).toBeGreaterThan(2);
  });
});

describe("CV layout parity", () => {
  it("defaults old CV drafts to Classic and leaves non-CV documents outside the CV styles", () => {
    expect(cvAppearance(createDocumentFromTemplate("cv"))?.layout).toBe("classic");
    expect(cvAppearance(createDocumentFromTemplate("thesis"))).toBeNull();
  });

  it("exports the selected CV styling and preserves an optional photo and editable text", async () => {
    for (const cvLayout of Object.keys(CV_LAYOUTS) as CvLayout[]) {
      const doc = {
        ...documentFromMarkdown("# Ama Mensah\n\n## Experience\n\nTeacher", { templateKind: "cv" }),
        cvLayout,
        cvAccent: "Teal" as const,
        profilePhotoDataUrl: PHOTO,
      };
      const pdf = await PDFDocument.load(await exportDocumentPdf(doc));
      expect(pdf.getPageCount()).toBe(1);
      const zip = await JSZip.loadAsync(await exportDocumentDocx(doc));
      const xml = await zip.file("word/document.xml")!.async("string");
      expect(xml).toContain("Ama Mensah");
      expect(xml).toContain("Teacher");
      expect(xml).toContain('w:color w:val="00675F"');
      expect(Object.keys(zip.files).some((name) => /^word\/media\/.+\.jpg$/.test(name))).toBe(true);
      if (cvLayout === "executive") expect(xml).toContain('w:fill="EDF1F5"');
      if (cvLayout === "editorial") expect(xml).toContain("<w:pBdr>");
      if (cvLayout === "signature") expect(xml).toContain('w:fill="00675F"');
    }
  });
});

describe("handwritten signatures", () => {
  const signature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1sAAAAASUVORK5CYII=";

  it("rejects non-PNG or malformed signatures", () => {
    expect(() => signatureImageBytes("https://example.com/signature.png")).toThrow();
    expect(() => signatureImageBytes("data:image/png;base64,AAAA")).toThrow();
    expect(signatureImageBytes(signature).length).toBeGreaterThan(24);
  });

  it("includes the signature in PDF and Word letters and keeps the text editable", async () => {
    const doc = {
      ...documentFromMarkdown("# Application letter\n\nPlease accept my application.", { templateKind: "application-letter" }),
      signatureDataUrl: signature,
    };
    const pdf = await PDFDocument.load(await exportDocumentPdf(doc));
    expect(pdf.getPage(0).node.Resources()?.has(require("../../web/node_modules/pdf-lib").PDFName.of("XObject"))).toBe(true);
    const zip = await JSZip.loadAsync(await exportDocumentDocx(doc));
    expect(Object.keys(zip.files).some((name) => /^word\/media\/.+\.png$/.test(name))).toBe(true);
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain("Please accept my application.");
    expect(xml).toContain("Handwritten signature");
  });
});
