/**
 * Promotion study-guide PDFs — honest counts, readable text, ZIP bundle.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { PROMOTION_RANK_BANK_SUMMARIES } from "../../web/lib/gigalearn/examPractice/centreConfig";

const ROOT = resolve(__dirname, "../..");
const GUIDE_DIR = resolve(
  ROOT,
  "web/public/downloads/gigalearn/promotion-guides"
);

const CANONICAL_PDFS = [
  {
    file: "GigaLearn_AD_II_550_Questions_Answers.pdf",
    expected: 295,
    rankId: "ad-ii",
  },
  {
    file: "GigaLearn_AD_I_550_Questions_Answers.pdf",
    expected: 282,
    rankId: "ad-i",
  },
  {
    file: "GigaLearn_DD_550_Questions_Answers.pdf",
    expected: 276,
    rankId: "deputy-director",
  },
  {
    file: "GigaLearn_D_II_550_Questions_Answers.pdf",
    expected: 281,
    rankId: "director-ii",
  },
  {
    file: "GigaLearn_D_I_550_Questions_Answers.pdf",
    expected: 285,
    rankId: "director-i",
  },
] as const;

function extractPdfText(path: string): string {
  // Prefer pdftotext when available; fall back to a minimal Python extract.
  try {
    return execFileSync("pdftotext", ["-layout", path, "-"], {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch {
    return execFileSync(
      "python3",
      [
        "-c",
        "import sys; from pypdf import PdfReader; r=PdfReader(sys.argv[1]); print('\\n'.join((p.extract_text() or '') for p in r.pages))",
        path,
      ],
      { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }
    );
  }
}

describe("promotion guide PDFs", () => {
  it("ships five canonical PDFs with readable text matching bank published counts", () => {
    for (const row of CANONICAL_PDFS) {
      const path = resolve(GUIDE_DIR, row.file);
      expect(existsSync(path), row.file).toBe(true);
      const text = extractPdfText(path);
      expect(text.length).toBeGreaterThan(500);
      expect(text).toMatch(/practice|not an official|GES/i);
      const markers = text.match(/Question\s+\d+\s*[·•]/g) ?? [];
      expect(markers.length).toBe(row.expected);
      const bank = PROMOTION_RANK_BANK_SUMMARIES.find((b) => b.id === row.rankId)!;
      expect(bank.publishedCount).toBe(row.expected);
      expect(bank.guidePdfHref).toBe(
        `/downloads/gigalearn/promotion-guides/${row.file}`
      );
    }
  });

  it("bundles the five canonical PDFs in the download ZIP", () => {
    const zipPath = resolve(
      GUIDE_DIR,
      "GigaLearn_Teacher_Promotion_Practice_Guides.zip"
    );
    expect(existsSync(zipPath)).toBe(true);
    const listing = execFileSync("unzip", ["-l", zipPath], { encoding: "utf8" });
    for (const row of CANONICAL_PDFS) {
      expect(listing).toContain(row.file);
    }
    // Honest-count filenames may also be present; ZIP must not invent a 550-verified claim.
    const audit = readFileSync(
      resolve(ROOT, "docs/gigalearn/promotion-550-content-audit.md"),
      "utf8"
    );
    expect(audit).toMatch(/1419/);
    expect(audit).toMatch(/must \*\*not\*\* be advertised as 550 distinct/i);
  });
});
