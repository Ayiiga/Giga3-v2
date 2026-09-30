import { describe, expect, it } from "vitest";
import { GIGA3_ATTRIBUTION_LINE } from "../../web/lib/share/giga3Attribution";
import {
  buildCleanDocumentDocxHtml,
  buildCleanDocumentExportModel,
  buildCleanDocumentPrintHtml,
  documentExportFilename,
  extractCleanDocumentContent,
  inferDocumentTitle,
  markdownToCleanDocumentHtml,
} from "../../web/lib/chat/cleanDocumentExport";

describe("extractCleanDocumentContent", () => {
  it("strips conversational intro and outro wrappers", () => {
    const raw = `Sure! Here's the report you asked for.

# Quarterly Report

Revenue grew 12% year over year.

| Quarter | Revenue |
| --- | --- |
| Q1 | $1.2M |

I hope this helps! Let me know if you need anything else.`;

    const cleaned = extractCleanDocumentContent(raw);
    expect(cleaned).toContain("# Quarterly Report");
    expect(cleaned).toContain("| Quarter | Revenue |");
    expect(cleaned).not.toMatch(/^sure!/i);
    expect(cleaned).not.toMatch(/i hope this helps/i);
  });

  it("removes Giga3 attribution lines", () => {
    const raw = `# Policy Brief

Key findings here.

${GIGA3_ATTRIBUTION_LINE}`;

    const cleaned = extractCleanDocumentContent(raw);
    expect(cleaned).not.toContain("Giga3 AI");
    expect(cleaned).not.toContain("giga3ai.com");
  });

  it("preserves markdown images in the document body", () => {
    const raw = `Here is the diagram:

# Architecture

![System diagram](https://cdn.example.com/diagram.png)

The diagram shows the flow.`;

    const cleaned = extractCleanDocumentContent(raw);
    expect(cleaned).toContain("![System diagram](https://cdn.example.com/diagram.png)");
    expect(cleaned).toContain("# Architecture");
  });
});

describe("inferDocumentTitle", () => {
  it("uses first H1 when present", () => {
    expect(inferDocumentTitle("# **Annual Plan**\n\nBody")).toBe("Annual Plan");
  });

  it("falls back to neutral default", () => {
    expect(inferDocumentTitle("Plain paragraph only.")).toBe("Document");
  });
});

describe("markdownToCleanDocumentHtml", () => {
  it("renders headings, lists, tables, blockquotes, and images", () => {
    const md = `# Title

Intro paragraph with **bold** and *italic*.

- Bullet one
- Bullet two

1. Step one
2. Step two

> A quoted note

| Col A | Col B |
| --- | --- |
| a | b |

![Chart](https://example.com/chart.png)`;

    const html = markdownToCleanDocumentHtml(md);
    expect(html).toContain("<h1");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<ul");
    expect(html).toContain("<ol");
    expect(html).toContain("<blockquote");
    expect(html).toContain("<table");
    expect(html).toContain('<img src="https://example.com/chart.png"');
  });
});

describe("buildCleanDocumentPrintHtml", () => {
  it("has no Giga3 branding in title or body chrome", () => {
    const model = buildCleanDocumentExportModel(
      `Sure, here you go.\n\n# Clean Export\n\nBody text.\n\nMade with Giga3 AI`
    );
    const html = buildCleanDocumentPrintHtml(model);
    expect(html).not.toContain("Giga3 AI");
    expect(html).not.toContain("giga3ai.com");
    expect(html).not.toContain("Made with Giga3");
    expect(html).toContain("<title>Clean Export</title>");
    expect(html).toContain("Body text.");
  });
});

describe("buildCleanDocumentDocxHtml", () => {
  it("wraps cleaned body without app header", () => {
    const model = buildCleanDocumentExportModel("# Memo\n\nContent.");
    const html = buildCleanDocumentDocxHtml(model);
    expect(html).not.toContain("Giga3 AI Chat Export");
    expect(html).not.toContain("<pre");
    expect(html).toContain("<h1");
    expect(html).toContain("Content.");
  });
});

describe("documentExportFilename", () => {
  it("slugifies title without giga3 prefix", () => {
    expect(documentExportFilename("Quarterly Report 2026", "doc")).toBe(
      "quarterly-report-2026.doc"
    );
  });
});
