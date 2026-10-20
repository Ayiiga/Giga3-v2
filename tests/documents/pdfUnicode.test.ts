import { describe, expect, it } from "vitest";
import {
  analyzePdfUnicodeCoverage,
  PDF_UNICODE_LIMITATION,
  sanitizeForPdfExport,
} from "../../web/lib/documents/pdfUnicode";

describe("PDF Unicode coverage (WinAnsi / StandardFonts)", () => {
  it("accepts Latin-1 and smart punctuation without warning", () => {
    const text = `Café résumé — “quotes” … Ama Mensah`;
    const analysis = analyzePdfUnicodeCoverage(text);
    expect(analysis.hasUnsupported).toBe(false);
    expect(analysis.warning).toBeNull();
    const sanitized = sanitizeForPdfExport(text);
    expect(sanitized.substitutedCount).toBe(0);
    expect(sanitized.text).toContain("Café");
    expect(sanitized.text).toContain('"quotes"');
    expect(sanitized.text).toContain("...");
  });

  it("flags CJK and does not delete characters without a visible marker", () => {
    const analysis = analyzePdfUnicodeCoverage("Hello 日本語");
    expect(analysis.hasUnsupported).toBe(true);
    expect(analysis.unsupportedCount).toBeGreaterThan(0);
    expect(analysis.warning).toContain("WinAnsi");
    expect(PDF_UNICODE_LIMITATION.length).toBeGreaterThan(40);

    const sanitized = sanitizeForPdfExport("Hello 日本語");
    expect(sanitized.substitutedCount).toBeGreaterThan(0);
    expect(sanitized.text).toContain("Hello");
    expect(sanitized.text).toContain("?");
    expect(sanitized.text).not.toContain("日本");
  });
});
