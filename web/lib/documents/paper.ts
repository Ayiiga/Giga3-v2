import type { DocPaper, DocPaperSize } from "@/lib/documents/types";

/** ISO sizes in millimetres. */
export const PAPER_SIZE_MM: Record<DocPaperSize, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
};

export function paperDimensionsMm(paper: DocPaper): { width: number; height: number } {
  const base = PAPER_SIZE_MM[paper.size];
  if (paper.orientation === "landscape") {
    return { width: base.height, height: base.width };
  }
  return { ...base };
}

/** Convert mm → PDF points (1 pt = 1/72 in; 1 in = 25.4 mm). */
export function mmToPt(mm: number): number {
  return (mm * 72) / 25.4;
}

export function paperDimensionsPt(paper: DocPaper): { width: number; height: number } {
  const mm = paperDimensionsMm(paper);
  return { width: mmToPt(mm.width), height: mmToPt(mm.height) };
}

/** CSS width for on-screen page preview (scaled). */
export function previewPageCss(paper: DocPaper, maxWidthPx = 720): {
  widthPx: number;
  aspectRatio: string;
  padding: string;
} {
  const { width, height } = paperDimensionsMm(paper);
  const widthPx = Math.min(maxWidthPx, paper.size === "A5" ? 480 : 720);
  const m = paper.marginsMm;
  return {
    widthPx,
    aspectRatio: `${width} / ${height}`,
    padding: `${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm`,
  };
}
