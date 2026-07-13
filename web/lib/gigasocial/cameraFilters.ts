/** Modern camera-style CSS filters for GigaSocial photo posts. */

export type CameraFilterId =
  | "none"
  | "clarendon"
  | "gingham"
  | "juno"
  | "lark"
  | "ludwig"
  | "moon"
  | "reyes"
  | "valencia"
  | "xpro2"
  | "vivid"
  | "noir"
  | "cinematic"
  | "portrait"
  | "hdr"
  | "ultra-hdr"
  | "creator-4k"
  | "creator-8k"
  | "studio"
  | "night"
  | "natural"
  | "documentary"
  | "film-look"
  | "action-cam"
  | "social-creator"
  | "pro-creator";

export type CameraFilter = {
  id: CameraFilterId;
  label: string;
  css: string;
  group?: "classic" | "premium";
};

export const CAMERA_FILTERS: CameraFilter[] = [
  { id: "none", label: "Original", css: "none", group: "classic" },
  { id: "clarendon", label: "Clarendon", css: "contrast(1.12) saturate(1.15) brightness(1.05)", group: "classic" },
  { id: "gingham", label: "Gingham", css: "brightness(1.04) contrast(0.92) sepia(0.04) saturate(1.1)", group: "classic" },
  { id: "juno", label: "Juno", css: "sepia(0.12) contrast(1.08) brightness(1.06) saturate(1.18)", group: "classic" },
  { id: "lark", label: "Lark", css: "brightness(1.08) contrast(0.94) saturate(1.12)", group: "classic" },
  { id: "ludwig", label: "Ludwig", css: "brightness(1.04) contrast(1.05) saturate(0.9) sepia(0.08)", group: "classic" },
  { id: "moon", label: "Moon", css: "grayscale(0.55) contrast(1.12) brightness(1.08)", group: "classic" },
  { id: "reyes", label: "Reyes", css: "sepia(0.18) brightness(1.1) contrast(0.88) saturate(0.82)", group: "classic" },
  { id: "valencia", label: "Valencia", css: "sepia(0.1) contrast(1.06) brightness(1.06) saturate(1.12)", group: "classic" },
  { id: "xpro2", label: "X-Pro II", css: "sepia(0.22) contrast(1.18) brightness(1.02) saturate(1.05)", group: "classic" },
  { id: "vivid", label: "Vivid", css: "saturate(1.35) contrast(1.08) brightness(1.03)", group: "classic" },
  { id: "noir", label: "Noir", css: "grayscale(0.85) contrast(1.2) brightness(0.95)", group: "classic" },
  { id: "cinematic", label: "Cinematic", css: "contrast(1.15) saturate(0.92) brightness(0.96) sepia(0.06)", group: "premium" },
  { id: "portrait", label: "Portrait", css: "brightness(1.05) contrast(0.98) saturate(1.05) blur(0.2px)", group: "premium" },
  { id: "hdr", label: "HDR", css: "contrast(1.22) saturate(1.28) brightness(1.04)", group: "premium" },
  { id: "ultra-hdr", label: "Ultra HDR", css: "contrast(1.3) saturate(1.4) brightness(1.06) hue-rotate(-4deg)", group: "premium" },
  { id: "creator-4k", label: "4K Creator", css: "contrast(1.1) saturate(1.2) brightness(1.03)", group: "premium" },
  { id: "creator-8k", label: "8K Creator", css: "contrast(1.14) saturate(1.25) brightness(1.04)", group: "premium" },
  { id: "studio", label: "Studio", css: "brightness(1.08) contrast(1.05) saturate(0.95)", group: "premium" },
  { id: "night", label: "Night Mode", css: "brightness(1.12) contrast(1.18) saturate(1.1) hue-rotate(8deg)", group: "premium" },
  { id: "natural", label: "Natural", css: "saturate(1.02) contrast(1.02) brightness(1.02)", group: "premium" },
  { id: "documentary", label: "Documentary", css: "sepia(0.08) contrast(1.1) saturate(0.88) brightness(0.98)", group: "premium" },
  { id: "film-look", label: "Film Look", css: "sepia(0.14) contrast(1.12) saturate(0.9) brightness(0.97)", group: "premium" },
  { id: "action-cam", label: "Action Camera", css: "saturate(1.3) contrast(1.2) brightness(1.05)", group: "premium" },
  { id: "social-creator", label: "Social Creator", css: "saturate(1.22) contrast(1.08) brightness(1.04)", group: "premium" },
  { id: "pro-creator", label: "Professional Creator", css: "contrast(1.08) saturate(1.1) brightness(1.02) sepia(0.03)", group: "premium" },
];

const FILTER_MAP = new Map(CAMERA_FILTERS.map((filter) => [filter.id, filter]));

export const PREMIUM_CAMERA_FILTERS = CAMERA_FILTERS.filter((f) => f.group === "premium");

export function getCameraFilter(id?: string | null): CameraFilter {
  if (!id) return FILTER_MAP.get("none")!;
  return FILTER_MAP.get(id as CameraFilterId) ?? FILTER_MAP.get("none")!;
}

export function getCameraFilterCss(id?: string | null): string | undefined {
  const filter = getCameraFilter(id);
  return filter.css === "none" ? undefined : filter.css;
}

export function isCameraFilterId(value: string): value is CameraFilterId {
  return FILTER_MAP.has(value as CameraFilterId);
}
