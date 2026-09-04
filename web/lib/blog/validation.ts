import { categorySlugForName } from "@/lib/blog/categories";
import type { BlogPost } from "@/lib/blog/types";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const REQUIRED: (keyof BlogPost)[] = [
  "slug",
  "title",
  "description",
  "excerpt",
  "category",
  "author",
  "publishedAt",
  "featuredImage",
  "featuredImageAlt",
];

function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed);
}

/** Fail fast at module load / build when post metadata is invalid. */
export function validateBlogPost(post: BlogPost, seenSlugs: Set<string>): void {
  for (const field of REQUIRED) {
    const value = post[field];
    if (value === undefined || value === null || String(value).trim() === "") {
      throw new Error(`Blog post "${post.slug || "(unknown)"}" is missing required field: ${field}`);
    }
  }

  if (!SLUG_RE.test(post.slug)) {
    throw new Error(`Blog post "${post.slug}" has an invalid slug (use lowercase hyphen-separated slugs)`);
  }

  if (seenSlugs.has(post.slug)) {
    throw new Error(`Duplicate blog slug: "${post.slug}"`);
  }
  seenSlugs.add(post.slug);

  if (!isValidDate(post.publishedAt)) {
    throw new Error(`Blog post "${post.slug}" has invalid publishedAt: ${post.publishedAt}`);
  }

  if (post.updatedAt && !isValidDate(post.updatedAt)) {
    throw new Error(`Blog post "${post.slug}" has invalid updatedAt: ${post.updatedAt}`);
  }

  if (post.updatedAt && post.updatedAt < post.publishedAt) {
    throw new Error(`Blog post "${post.slug}" updatedAt cannot be before publishedAt`);
  }

  if (!categorySlugForName(post.category)) {
    throw new Error(
      `Blog post "${post.slug}" has unknown category "${post.category}". Use a defined BLOG_CATEGORIES name.`
    );
  }

  if (!Array.isArray(post.tags) || post.tags.length === 0) {
    throw new Error(`Blog post "${post.slug}" must include at least one tag`);
  }
}

export function validateBlogPosts(posts: BlogPost[]): void {
  const seen = new Set<string>();
  for (const post of posts) {
    validateBlogPost(post, seen);
  }
}
