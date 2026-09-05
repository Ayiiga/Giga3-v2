import { BLOG_POST_REGISTRY } from "@/lib/blog/postRegistry";
import { estimateReadingTime } from "@/lib/blog/readingTime";
import type { BlogPost, BlogPostWithPath } from "@/lib/blog/types";
import { validateBlogPosts } from "@/lib/blog/validation";

function withPath(post: BlogPost, readingTime: string): BlogPostWithPath {
  return { ...post, readingTime, href: `/blog/${post.slug}/` };
}

/** Registry-only listing — safe for SEO tests without loading article body modules. */
export function getRegistryBlogPosts(): BlogPostWithPath[] {
  validateBlogPosts([...BLOG_POST_REGISTRY]);
  return BLOG_POST_REGISTRY.map((meta) => {
    const readingTime =
      meta.readingTime ?? estimateReadingTime(`${meta.excerpt} ${meta.description}`);
    return withPath(meta, readingTime);
  });
}

export function getRegistryBlogPostBySlug(slug: string): BlogPostWithPath | null {
  return getRegistryBlogPosts().find((post) => post.slug === slug) ?? null;
}

export function getRelatedRegistryBlogPosts(
  post: BlogPostWithPath,
  limit = 3
): BlogPostWithPath[] {
  const scored = getRegistryBlogPosts()
    .filter((entry) => entry.slug !== post.slug)
    .map((entry) => {
      let score = 0;
      if (entry.category === post.category) score += 3;
      const sharedTags = entry.tags.filter((t) => post.tags.includes(t));
      score += sharedTags.length * 2;
      return { post: entry, score };
    });

  return scored
    .sort((a, b) => b.score - a.score || b.post.publishedAt.localeCompare(a.post.publishedAt))
    .slice(0, limit)
    .map((row) => row.post);
}

export function getBlogSitemapEntriesFromRegistry(): { loc: string; lastmod: string }[] {
  const origin = "https://www.giga3ai.com";
  const blogIndex = { loc: `${origin}/blog/`, lastmod: "2026-09-04" };
  const articles = getRegistryBlogPosts().map((post) => ({
    loc: `${origin}${post.href}`,
    lastmod: post.updatedAt ?? post.publishedAt,
  }));
  return [blogIndex, ...articles];
}
