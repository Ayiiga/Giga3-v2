import { BLOG_POST_REGISTRY } from "@/lib/blog/postRegistry";
import { estimateReadingTime } from "@/lib/blog/readingTime";
import type { BlogPost, BlogPostWithPath } from "@/lib/blog/types";
import { validateBlogPosts } from "@/lib/blog/validation";
import { BestAiToolsInGhana2026Body } from "@/content/blog/best-ai-tools-in-ghana-2026";
import { AiForBeceWassceBody } from "@/content/blog/ai-for-bece-wassce-preparation-ghana";
import { TopAiAppsInGhana2026Body } from "@/content/blog/top-ai-apps-in-ghana-2026";
import type { ComponentType } from "react";

export type BlogArticleBodyProps = {
  post: BlogPostWithPath;
};

type BlogEntry = {
  post: BlogPostWithPath;
  Body: ComponentType<BlogArticleBodyProps>;
  plainText: string;
};

const BODY_BY_SLUG: Record<string, { Body: ComponentType<BlogArticleBodyProps>; plainText: string }> =
  {
    "best-ai-tools-in-ghana-2026": BestAiToolsInGhana2026Body,
    "ai-for-bece-wassce-preparation-ghana": AiForBeceWassceBody,
    "top-ai-apps-in-ghana-2026": TopAiAppsInGhana2026Body,
  };

function withPath(post: BlogPost, readingTime: string): BlogPostWithPath {
  return { ...post, readingTime, href: `/blog/${post.slug}/` };
}

function buildEntries(): BlogEntry[] {
  validateBlogPosts([...BLOG_POST_REGISTRY]);

  const entries: BlogEntry[] = [];
  for (const meta of BLOG_POST_REGISTRY) {
    const body = BODY_BY_SLUG[meta.slug];
    if (!body) {
      throw new Error(`Blog post "${meta.slug}" is registered but has no article body module`);
    }
    const readingTime = meta.readingTime ?? estimateReadingTime(body.plainText);
    entries.push({
      post: withPath(meta, readingTime),
      Body: body.Body,
      plainText: body.plainText,
    });
  }
  return entries;
}

const ENTRIES = buildEntries();

export function getAllBlogPosts(): BlogPostWithPath[] {
  return ENTRIES.map((e) => e.post);
}

export function getBlogPostBySlug(slug: string): BlogEntry | null {
  return ENTRIES.find((e) => e.post.slug === slug) ?? null;
}

export function getRelatedBlogPosts(post: BlogPostWithPath, limit = 3): BlogPostWithPath[] {
  const scored = ENTRIES.filter((e) => e.post.slug !== post.slug).map((entry) => {
    let score = 0;
    if (entry.post.category === post.category) score += 3;
    const sharedTags = entry.post.tags.filter((t) => post.tags.includes(t));
    score += sharedTags.length * 2;
    return { post: entry.post, score };
  });

  return scored
    .sort((a, b) => b.score - a.score || b.post.publishedAt.localeCompare(a.post.publishedAt))
    .slice(0, limit)
    .map((row) => row.post);
}

export function getBlogPostsByCategory(categoryName: string): BlogPostWithPath[] {
  return getAllBlogPosts().filter((p) => p.category === categoryName);
}

export function getBlogSitemapEntries(): { loc: string; lastmod: string }[] {
  const origin = "https://www.giga3ai.com";
  const blogIndex = { loc: `${origin}/blog/`, lastmod: "2026-09-04" };
  const articles = getAllBlogPosts().map((post) => ({
    loc: `${origin}${post.href}`,
    lastmod: post.updatedAt ?? post.publishedAt,
  }));
  return [blogIndex, ...articles];
}
