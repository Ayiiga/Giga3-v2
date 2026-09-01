export const MARKETPLACE_CATEGORIES = [
  "Education",
  "Faith & Inspiration",
  "Business",
  "Design Assets",
  "Technology",
  "Research",
  "Marketing",
  "Productivity",
] as const;

export const PRODUCT_TYPES = [
  { id: "ebook", label: "eBook" },
  { id: "lesson_notes", label: "Lesson Notes" },
  { id: "sermon", label: "Sermon" },
  { id: "project", label: "Project" },
  { id: "research_paper", label: "Research Paper" },
  { id: "ai_prompt", label: "AI Prompt" },
  { id: "template", label: "Template" },
  { id: "source_code", label: "Source Code" },
  { id: "poster", label: "Poster" },
  { id: "flyer", label: "Flyer" },
  { id: "brochure", label: "Brochure" },
  { id: "business_document", label: "Business Document" },
  { id: "educational_resource", label: "Educational Resource" },
  { id: "motivational_book", label: "Motivational Book" },
  { id: "other", label: "Other" },
] as const;

export const LICENSE_TYPES = [
  { id: "personal", label: "Personal use" },
  { id: "commercial", label: "Commercial use" },
  { id: "extended", label: "Extended license" },
  { id: "exclusive", label: "Exclusive license" },
] as const;

/** Shown in seller UI — keep the marketplace simple for v1. */
export const SIMPLE_PRODUCT_TYPES = PRODUCT_TYPES.filter((t) =>
  (["ebook", "template", "educational_resource", "business_document", "other"] as const).includes(
    t.id as (typeof PRODUCT_TYPES)[number]["id"]
  )
);

export const SIMPLE_LICENSE_TYPES = LICENSE_TYPES.filter((l) =>
  (["personal", "commercial"] as const).includes(l.id)
);

export const SIMPLE_CATEGORIES = [
  "Education",
  "Business",
  "Technology",
  "Marketing",
  "Faith & Inspiration",
] as const;

export function formatGhs(amount: number): string {
  return `GHS ${amount.toLocaleString()}`;
}
