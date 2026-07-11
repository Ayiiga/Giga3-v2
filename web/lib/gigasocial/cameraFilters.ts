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
  | "noir";

export type CameraFilter = {
  id: CameraFilterId;
  label: string;
  css: string;
};

export const CAMERA_FILTERS: CameraFilter[] = [
  { id: "none", label: "Original", css: "none" },
  {
    id: "clarendon",
    label: "Clarendon",
    css: "contrast(1.12) saturate(1.15) brightness(1.05)",
  },
  {
    id: "gingham",
    label: "Gingham",
    css: "brightness(1.04) contrast(0.92) sepia(0.04) saturate(1.1)",
  },
  {
    id: "juno",
    label: "Juno",
    css: "sepia(0.12) contrast(1.08) brightness(1.06) saturate(1.18)",
  },
  {
    id: "lark",
    label: "Lark",
    css: "brightness(1.08) contrast(0.94) saturate(1.12)",
  },
  {
    id: "ludwig",
    label: "Ludwig",
    css: "brightness(1.04) contrast(1.05) saturate(0.9) sepia(0.08)",
  },
  {
    id: "moon",
    label: "Moon",
    css: "grayscale(0.55) contrast(1.12) brightness(1.08)",
  },
  {
    id: "reyes",
    label: "Reyes",
    css: "sepia(0.18) brightness(1.1) contrast(0.88) saturate(0.82)",
  },
  {
    id: "valencia",
    label: "Valencia",
    css: "sepia(0.1) contrast(1.06) brightness(1.06) saturate(1.12)",
  },
  {
    id: "xpro2",
    label: "X-Pro II",
    css: "sepia(0.22) contrast(1.18) brightness(1.02) saturate(1.05)",
  },
  {
    id: "vivid",
    label: "Vivid",
    css: "saturate(1.35) contrast(1.08) brightness(1.03)",
  },
  {
    id: "noir",
    label: "Noir",
    css: "grayscale(0.85) contrast(1.2) brightness(0.95)",
  },
];

const FILTER_MAP = new Map(CAMERA_FILTERS.map((filter) => [filter.id, filter]));

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
