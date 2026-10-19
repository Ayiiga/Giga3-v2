/**
 * GigaLearn Academy visual design tokens (Phase visual upgrade).
 * Presentation only — no behaviour or data changes.
 */

export type AcademyStudioThemeId =
  | "giga-ai"
  | "giga-web"
  | "giga-pwa"
  | "giga-app"
  | "giga-coding"
  | "giga-robotics"
  | "giga-innovation";

export type AcademySurfaceId =
  | "hero"
  | "dashboard"
  | "practice"
  | "performance"
  | "certificates"
  | "catalogue";

/** Canonical hex tokens from the design brief (may be tuned for AA contrast). */
export const ACADEMY_COLOUR_TOKENS = {
  hero: { bg: "#4C1D95", bgAlt: "#312E81", fg: "#FFFFFF" },
  dashboard: { bg: "#F3E8FF", fg: "#2E1065" },
  practice: { bg: "#1E3A8A", fg: "#FFFFFF" },
  performance: { bg: "#DCFCE7", fg: "#14532D" },
  certificates: { bg: "#FEF3C7", fg: "#78350F" },
  catalogue: { bg: "#FFFFFF", fg: "#0F172A" },
  studios: {
    "giga-ai": { bg: "#312E81", fg: "#FFFFFF" },
    "giga-web": { bg: "#DBEAFE", fg: "#172554" },
    "giga-pwa": { bg: "#CCFBF1", fg: "#134E4A" },
    "giga-app": { bg: "#FFEDD5", fg: "#7C2D12" },
    "giga-coding": { bg: "#EDE9FE", fg: "#4C1D95" },
    "giga-robotics": { bg: "#CFFAFE", fg: "#164E63" },
    "giga-innovation": { bg: "#FFE4E6", fg: "#881337" },
  },
} as const;

export const ACADEMY_SURFACE_CLASS: Record<AcademySurfaceId, string> = {
  hero: "academy-visual-hero",
  dashboard: "academy-visual-dashboard",
  practice: "academy-visual-practice",
  performance: "academy-visual-performance",
  certificates: "academy-visual-certificates",
  catalogue: "academy-visual-catalogue",
};

export const ACADEMY_STUDIO_CLASS: Record<AcademyStudioThemeId, string> = {
  "giga-ai": "academy-visual-studio academy-visual-studio--giga-ai",
  "giga-web": "academy-visual-studio academy-visual-studio--giga-web",
  "giga-pwa": "academy-visual-studio academy-visual-studio--giga-pwa",
  "giga-app": "academy-visual-studio academy-visual-studio--giga-app",
  "giga-coding": "academy-visual-studio academy-visual-studio--giga-coding",
  "giga-robotics": "academy-visual-studio academy-visual-studio--giga-robotics",
  "giga-innovation": "academy-visual-studio academy-visual-studio--giga-innovation",
};

export function studioThemeClass(studioId: string): string {
  if (studioId in ACADEMY_STUDIO_CLASS) {
    return ACADEMY_STUDIO_CLASS[studioId as AcademyStudioThemeId];
  }
  return "academy-visual-studio academy-visual-studio--giga-coding";
}
