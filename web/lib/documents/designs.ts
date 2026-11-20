import { CV_ACCENTS, cvAppearance, type CvAccent, type CvAppearance } from "@/lib/documents/cvLayouts";
import type { DocumentTemplateKind, GigaDocument } from "@/lib/documents/types";

export const DOCUMENT_DESIGNS = {
  classic: { name: "Classic", treatment: "plain", accent: "Slate", serif: true },
  editorial: { name: "Editorial", treatment: "rule", accent: "Teal", serif: false },
  business: { name: "Business", treatment: "signature", accent: "Navy", serif: false },
  academic: { name: "Academic", treatment: "band", accent: "Slate", serif: true },
} as const;

export type DocumentDesign = keyof typeof DOCUMENT_DESIGNS;

const DEFAULT_DESIGNS: Partial<Record<DocumentTemplateKind, DocumentDesign>> = {
  "business-plan": "business",
  proposal: "business",
  presentation: "business",
  invoice: "business",
  report: "editorial",
  "lesson-notes": "editorial",
  "meeting-minutes": "editorial",
  "research-paper": "academic",
  thesis: "academic",
};

export type DocumentAppearance = Pick<CvAppearance, "color" | "treatment"> & {
  layout: CvAppearance["layout"] | DocumentDesign;
  accent: CvAccent;
  serif: boolean;
};

export function documentAppearance(doc: Pick<GigaDocument, "templateKind" | "cvLayout" | "cvAccent" | "documentDesign" | "documentAccent">): DocumentAppearance {
  const cv = cvAppearance(doc);
  if (cv) return { ...cv, serif: false };
  const defaultLayout = Object.hasOwn(DEFAULT_DESIGNS, doc.templateKind) ? DEFAULT_DESIGNS[doc.templateKind] : undefined;
  const layout = doc.documentDesign && Object.hasOwn(DOCUMENT_DESIGNS, doc.documentDesign)
    ? doc.documentDesign
    : defaultLayout ?? "classic";
  const preset = DOCUMENT_DESIGNS[layout];
  const accent = doc.documentAccent && Object.hasOwn(CV_ACCENTS, doc.documentAccent) ? doc.documentAccent : preset.accent;
  return { layout, accent, color: CV_ACCENTS[accent], treatment: preset.treatment, serif: preset.serif };
}
