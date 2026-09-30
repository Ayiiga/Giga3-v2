/** Geographic filters for curated trend discovery — not live rankings. */

export type TrendRegionId =
  | "ghana"
  | "nigeria"
  | "kenya"
  | "south-africa"
  | "africa"
  | "global";

export type TrendRegion = {
  id: TrendRegionId;
  label: string;
  description: string;
};

export const TREND_REGIONS: TrendRegion[] = [
  {
    id: "ghana",
    label: "Ghana",
    description: "Curated Ghana-focused topics and education links.",
  },
  {
    id: "nigeria",
    label: "Nigeria",
    description: "Curated Nigeria-focused business and tech topics.",
  },
  {
    id: "kenya",
    label: "Kenya",
    description: "Curated Kenya-focused innovation and education topics.",
  },
  {
    id: "south-africa",
    label: "South Africa",
    description: "Curated South Africa-focused technology topics.",
  },
  {
    id: "africa",
    label: "Africa",
    description: "Pan-African curated topics — not live engagement rankings.",
  },
  {
    id: "global",
    label: "Global",
    description: "Worldwide AI and technology topics.",
  },
];

export function getTrendRegion(id: string): TrendRegion | undefined {
  return TREND_REGIONS.find((r) => r.id === id);
}
