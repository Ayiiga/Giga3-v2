/**
 * Marketplace discovery collections (Phase 1 transform).
 * Maps to existing listing.category + productType without migrating DB rows.
 */
import type { PRODUCT_TYPES } from "@/lib/marketplace/catalog";

export type DiscoveryCollectionId =
  | "ebooks-learning"
  | "courses-training"
  | "ai-prompts"
  | "design-templates"
  | "software-dev"
  | "creator-resources";

export type DiscoveryCollection = {
  id: DiscoveryCollectionId;
  label: string;
  description: string;
  /** Legacy category strings that belong here. */
  categories: string[];
  /** productType ids that belong here. */
  productTypes: Array<(typeof PRODUCT_TYPES)[number]["id"]>;
};

export const DISCOVERY_COLLECTIONS: DiscoveryCollection[] = [
  {
    id: "ebooks-learning",
    label: "eBooks and Learning Materials",
    description: "Guides, notes, and study PDFs",
    categories: ["Education", "Research", "Faith & Inspiration"],
    productTypes: ["ebook", "lesson_notes", "educational_resource", "motivational_book", "research_paper", "sermon"],
  },
  {
    id: "courses-training",
    label: "Online Courses and Training",
    description: "Structured training packs",
    categories: ["Education"],
    productTypes: ["educational_resource", "project"],
  },
  {
    id: "ai-prompts",
    label: "AI Prompts and AI Resources",
    description: "Prompt packs and AI workflows",
    categories: ["Technology", "Productivity", "Marketing"],
    productTypes: ["ai_prompt"],
  },
  {
    id: "design-templates",
    label: "Design Assets and Templates",
    description: "Posters, flyers, and templates",
    categories: ["Design Assets", "Marketing"],
    productTypes: ["template", "poster", "flyer", "brochure"],
  },
  {
    id: "software-dev",
    label: "Software and Developer Resources",
    description: "Code, projects, and tools",
    categories: ["Technology"],
    productTypes: ["source_code", "project"],
  },
  {
    id: "creator-resources",
    label: "Creator Resources",
    description: "Business docs and creator kits",
    categories: ["Business", "Marketing", "Productivity"],
    productTypes: ["business_document", "template", "other"],
  },
];

export const PRICE_FILTERS = [
  { id: "", label: "Any price", min: undefined, max: undefined },
  { id: "under-20", label: "Under GHS 20", min: undefined, max: 20 },
  { id: "20-100", label: "GHS 20 – 100", min: 20, max: 100 },
  { id: "100-200", label: "GHS 100 – 200", min: 100, max: 200 },
  { id: "200-plus", label: "GHS 200+", min: 200, max: undefined },
] as const;

export function listingMatchesCollection(
  listing: { category: string; productType: string },
  collectionId: DiscoveryCollectionId | ""
): boolean {
  if (!collectionId) return true;
  const col = DISCOVERY_COLLECTIONS.find((c) => c.id === collectionId);
  if (!col) return true;
  return (
    col.categories.includes(listing.category) ||
    col.productTypes.includes(listing.productType as (typeof PRODUCT_TYPES)[number]["id"])
  );
}

export function listingMatchesPrice(
  priceGhs: number,
  min?: number,
  max?: number
): boolean {
  if (min != null && priceGhs < min) return false;
  if (max != null && priceGhs > max) return false;
  return true;
}
