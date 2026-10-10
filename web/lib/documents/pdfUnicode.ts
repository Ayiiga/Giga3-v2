/**
 * PDF Unicode coverage for Document Studio (pdf-lib StandardFonts / WinAnsi).
 *
 * Decision for this release (smallest reliable path):
 * - Do **not** ship a multi‑MB CJK/Noto font bundle (licensing is fine for Noto SIL OFL,
 *   but full glyph coverage + mobile download size is not release-safe without subsetting infra).
 * - Latin-1 / WinAnsi text (including many African Latin orthographies that fit WinAnsi) is preserved.
 * - Characters outside WinAnsi are **never deleted silently**: they become a visible "?" placeholder
 *   only after the user is warned and chooses PDF, or they can Export Word (full Unicode).
 *
 * Follow-up: embed a subsetted Unicode font (e.g. Noto Sans) via pdf-lib + fontkit when
 * bundle size and subset pipeline are ready.
 */

export const PDF_UNICODE_LIMITATION =
  "PDF export uses standard PDF fonts (WinAnsi). Characters outside that set (for example Japanese, Chinese, Korean, or many emoji) are shown as “?” in the PDF. Export as Word to keep full Unicode. Latin letters, digits, and common Western European accents are preserved.";

/** True if a code point cannot be encoded in WinAnsi (after smart-punct normalization). */
export function isOutsideWinAnsi(codePoint: number): boolean {
  if (codePoint === 0x09 || codePoint === 0x0a || codePoint === 0x0d) return false;
  if (codePoint >= 0x20 && codePoint <= 0x7e) return false;
  if (codePoint >= 0xa0 && codePoint <= 0xff) return false;
  return true;
}

function normalizeSmartPunctuation(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ");
}

export type PdfUnicodeAnalysis = {
  hasUnsupported: boolean;
  unsupportedCount: number;
  /** Distinct unsupported characters (capped) for UI samples. */
  samples: string[];
  warning: string | null;
};

export function analyzePdfUnicodeCoverage(text: string): PdfUnicodeAnalysis {
  const normalized = normalizeSmartPunctuation(text);
  const samples: string[] = [];
  let unsupportedCount = 0;
  for (const ch of normalized) {
    const cp = ch.codePointAt(0);
    if (cp == null || !isOutsideWinAnsi(cp)) continue;
    unsupportedCount += 1;
    if (samples.length < 8 && !samples.includes(ch)) samples.push(ch);
  }
  if (unsupportedCount === 0) {
    return { hasUnsupported: false, unsupportedCount: 0, samples: [], warning: null };
  }
  return {
    hasUnsupported: true,
    unsupportedCount,
    samples,
    warning: `${PDF_UNICODE_LIMITATION} Found ${unsupportedCount} unsupported character(s) such as: ${samples.join(" ")}.`,
  };
}

/**
 * Prepare text for StandardFonts drawing. Unsupported glyphs become "?" — callers must
 * warn the user before using this for PDF export (never treat as silent).
 */
export function sanitizeForPdfExport(text: string): {
  text: string;
  substitutedCount: number;
  samples: string[];
} {
  const normalized = normalizeSmartPunctuation(text);
  let substitutedCount = 0;
  const samples: string[] = [];
  let out = "";
  for (const ch of normalized) {
    const cp = ch.codePointAt(0) ?? 0;
    if (isOutsideWinAnsi(cp)) {
      substitutedCount += 1;
      if (samples.length < 8 && !samples.includes(ch)) samples.push(ch);
      out += "?";
    } else {
      out += ch;
    }
  }
  return { text: out, substitutedCount, samples };
}
