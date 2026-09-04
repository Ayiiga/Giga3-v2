/** Blog categories — slug is used in /blog/category/[slug]/ URLs. */
export const BLOG_CATEGORIES = [
  { name: "AI in Ghana", slug: "ai-in-ghana" },
  { name: "Education", slug: "education" },
  { name: "BECE & WASSCE", slug: "bece-wassce" },
  { name: "AI Tools", slug: "ai-tools" },
  { name: "Creators", slug: "creators" },
  { name: "Business", slug: "business" },
  { name: "Technology", slug: "technology" },
] as const;

export type BlogCategoryName = (typeof BLOG_CATEGORIES)[number]["name"];
export type BlogCategorySlug = (typeof BLOG_CATEGORIES)[number]["slug"];

const slugByName = new Map(BLOG_CATEGORIES.map((c) => [c.name, c.slug]));
const nameBySlug = new Map(BLOG_CATEGORIES.map((c) => [c.slug, c.name]));

export function categorySlugForName(name: string): BlogCategorySlug | null {
  return (slugByName.get(name) as BlogCategorySlug | undefined) ?? null;
}

export function categoryNameForSlug(slug: string): BlogCategoryName | null {
  return (nameBySlug.get(slug as BlogCategorySlug) as BlogCategoryName | undefined) ?? null;
}

export function blogCategoryPath(slug: BlogCategorySlug): `/blog/category/${string}/` {
  return `/blog/category/${slug}/`;
}
