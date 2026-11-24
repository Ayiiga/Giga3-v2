import type { GigaDocument } from "@/lib/documents/types";

export const CV_LAYOUTS = {
  atelier: { name: "Atelier", category: "Modern", description: "Colour masthead and ruled section titles", treatment: "masthead" },
  classic: { name: "Classic", category: "Professional", description: "Single column with understated headings", treatment: "plain" },
  executive: { name: "Executive", category: "Professional", description: "Shaded section headings for quick reading", treatment: "band" },
  editorial: { name: "Editorial", category: "Modern", description: "Fine rules and strong section titles", treatment: "rule" },
  signature: { name: "Signature", category: "Modern", description: "Bold name header with a strong accent", treatment: "signature" },
} as const;

export const CV_ACCENTS = {
  Slate: "#243047",
  Navy: "#163e6a",
  Violet: "#5b21b6",
  Teal: "#00675f",
  Burgundy: "#8b254b",
} as const;

export type CvLayout = keyof typeof CV_LAYOUTS;
export const CV_PALETTES = { atelier: "Violet", classic: "Slate", executive: "Navy", editorial: "Teal", signature: "Burgundy" } as const;
export type CvAccent = keyof typeof CV_ACCENTS;

export function cvAppearance(doc: Pick<GigaDocument, "templateKind" | "cvLayout" | "cvAccent">) {
  if (doc.templateKind !== "cv") return null;
  const layout = doc.cvLayout && Object.hasOwn(CV_LAYOUTS, doc.cvLayout) ? doc.cvLayout : "classic";
  const accent = doc.cvAccent && Object.hasOwn(CV_ACCENTS, doc.cvAccent) ? doc.cvAccent : "Slate";
  return { layout, accent, color: CV_ACCENTS[accent], treatment: CV_LAYOUTS[layout].treatment };
}

export type CvAppearance = NonNullable<ReturnType<typeof cvAppearance>>;

export function cvHeadingStyle(appearance: Pick<CvAppearance, "color" | "treatment">, level: number) {
  const banner = level === 1 && (appearance.treatment === "signature" || appearance.treatment === "masthead");
  return {
    color: banner ? "#ffffff" : appearance.color,
    fill: banner ? appearance.color : level === 2 && appearance.treatment === "band" ? "#edf1f5" : undefined,
    rule: (level === 2 && (appearance.treatment === "rule" || appearance.treatment === "masthead")) ? appearance.color : undefined,
  };
}
