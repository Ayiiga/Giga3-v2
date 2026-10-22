/**
 * Promotion study-guide PDFs — honest counts, ZIP bundle, bank alignment.
 * Full text extraction runs when `pdftotext` is available (local/agent VMs).
 * CI validates PDF structure + ZIP + meta counts without poppler/pypdf.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { PROMOTION_RANK_BANK_SUMMARIES } from "../../web/lib/gigalearn/examPractice/centreConfig";
import { getExamBankMeta } from "../../web/lib/gigalearn/examPractice/examBankMeta";

const ROOT = resolve(__dirname, "../..");
const GUIDE_DIR = resolve(
  ROOT,
  "web/public/downloads/gigalearn/promotion-guides"
);

const CANONICAL_PDFS = [
  {
    file: "GigaLearn_AD_II_295_Practice_Questions_Answers.pdf",
    expected: 295,
    rankId: "ad-ii",
    courseSlug: "exam-ad-ii",
  },
  {
    file: "GigaLearn_AD_I_87_Practice_Questions_Answers.pdf",
    expected: 87,
    rankId: "ad-i",
    courseSlug: "exam-ad-i",
  },
  {
    file: "GigaLearn_DD_52_Practice_Questions_Answers.pdf",
    expected: 52,
    rankId: "deputy-director",
    courseSlug: "exam-deputy-director",
  },
  {
    file: "GigaLearn_D_II_40_Practice_Questions_Answers.pdf",
    expected: 40,
    rankId: "director-ii",
    courseSlug: "exam-director-ii",
  },
  {
    file: "GigaLearn_D_I_46_Practice_Questions_Answers.pdf",
    expected: 46,
    rankId: "director-i",
    courseSlug: "exam-director-i",
  },
] as const;

function tryPdftotext(path: string): string | null {
  try {
    return execFileSync("pdftotext", ["-layout", path, "-"], {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

describe("promotion guide PDFs", () => {
  it("ships five canonical PDFs aligned with published bank counts", () => {
    for (const row of CANONICAL_PDFS) {
      const path = resolve(GUIDE_DIR, row.file);
      expect(existsSync(path), row.file).toBe(true);
      const buf = readFileSync(path);
      expect(buf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
      // Smaller ranks produce smaller guides; require a non-trivial PDF payload.
      expect(buf.length).toBeGreaterThan(10_000);

      const meta = getExamBankMeta(row.courseSlug);
      const published =
        (meta?.approvedQuestionCount ?? 0) + (meta?.pendingQuestionCount ?? 0);
      expect(published).toBe(row.expected);

      const bank = PROMOTION_RANK_BANK_SUMMARIES.find((b) => b.id === row.rankId)!;
      expect(bank.publishedCount).toBe(row.expected);
      expect(bank.guidePdfHref).toBe(
        `/downloads/gigalearn/promotion-guides/${row.file}`
      );

      const text = tryPdftotext(path);
      if (text != null) {
        expect(text.length).toBeGreaterThan(500);
        expect(text).toMatch(/practice|not an official|GES/i);
        const markers = text.match(/Question\s+\d+\s*[·•.]?/g) ?? [];
        expect(markers.length).toBe(row.expected);
      }
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
    const audit = readFileSync(
      resolve(ROOT, "docs/gigalearn/promotion-550-content-audit.md"),
      "utf8"
    );
    expect(audit).toMatch(/520/);
    expect(audit).toMatch(/Cross-rank|cross-rank/i);
    expect(audit).toMatch(/must \*\*not\*\* be advertised as 550 distinct/i);
  });
});
