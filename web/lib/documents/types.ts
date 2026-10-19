/** Shared structured document model for Chat, GigaLearn, and Create. */

export type DocPaperSize = "A4" | "A5";
export type DocOrientation = "portrait" | "landscape";
export type DocAlign = "left" | "center" | "right" | "justify";

export type DocTextColor = "black" | "white" | "violet" | "red" | "blue";

export const DOC_TEXT_COLORS: Record<DocTextColor, string> = {
  black: "#18181b",
  white: "#ffffff",
  violet: "#5b21b6",
  red: "#b91c1c",
  blue: "#1d4ed8",
};

export type DocMarginsMm = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type DocPaper = {
  size: DocPaperSize;
  orientation: DocOrientation;
  marginsMm: DocMarginsMm;
  /** Soft one-page fit for CV — never silently deletes content. */
  onePageFit?: boolean;
};

/** TipTap / ProseMirror JSON document body. */
export type DocJson = {
  type: "doc";
  content?: unknown[];
};

export type DocumentTemplateKind =
  | "cv"
  | "application-letter"
  | "business-plan"
  | "report"
  | "proposal"
  | "lesson-notes"
  | "meeting-minutes"
  | "invoice"
  | "memo"
  | "generic";

export type GigaDocument = {
  id: string;
  title: string;
  templateKind: DocumentTemplateKind;
  paper: DocPaper;
  /** Structured TipTap JSON — source of truth for edit + export. */
  content: DocJson;
  /** Markdown snapshot for chat handoff / AI regenerate. */
  markdown: string;
  createdAt: number;
  updatedAt: number;
  /** Soft warning when one-page fit cannot reasonably hold content. */
  fitWarning?: string | null;
};

export const DEFAULT_MARGINS_MM: DocMarginsMm = {
  top: 18,
  right: 16,
  bottom: 18,
  left: 16,
};

export function defaultPaper(size: DocPaperSize = "A4"): DocPaper {
  return {
    size,
    orientation: "portrait",
    marginsMm: { ...DEFAULT_MARGINS_MM },
    onePageFit: size === "A5",
  };
}
