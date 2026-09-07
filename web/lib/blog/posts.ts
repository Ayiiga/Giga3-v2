import { BLOG_POST_REGISTRY } from "@/lib/blog/postRegistry";
import { estimateReadingTime } from "@/lib/blog/readingTime";
import type { BlogPost, BlogPostWithPath } from "@/lib/blog/types";
import { validateBlogPosts } from "@/lib/blog/validation";
import {
  getBlogSitemapEntriesFromRegistry,
  getRelatedRegistryBlogPosts,
} from "@/lib/blog/postListing";
import { BestAiToolsInGhana2026Body } from "@/content/blog/best-ai-tools-in-ghana-2026";
import { AiForBeceWassceBody } from "@/content/blog/ai-for-bece-wassce-preparation-ghana";
import { TopAiAppsInGhana2026Body } from "@/content/blog/top-ai-apps-in-ghana-2026";
import { Wassce2026ResultsGhanaBody } from "@/content/blog/wassce-2026-results-ghana";
import { GhanaWageSystemBody } from "@/content/blog/ghana-wage-system-ghc-60000-vs-ghc-21-77";
import { OneMillionCodersGhanaBody } from "@/content/blog/one-million-coders-ghana-tech-future";
import { AiToolsForGhanaianStudents2026Body } from "@/content/blog/ai-tools-for-ghanaian-students-2026";
import { AiForGhanaianTeachersBody } from "@/content/blog/ai-for-ghanaian-teachers";
import { WassceAiStudyGuideBody } from "@/content/blog/wassce-ai-study-guide";
import { AiMoneyMakingOpportunitiesGhanaBody } from "@/content/blog/ai-money-making-opportunities-ghana";
import { FacebookTiktokWhatsappFactCheckingBody } from "@/content/blog/facebook-tiktok-whatsapp-fact-checking";
import { AfricanYouthAiFutureJobsBody } from "@/content/blog/african-youth-ai-future-jobs";
import { GhanaAiFutureOpportunitiesChallengesBody } from "@/content/blog/ghana-ai-future-opportunities-challenges";
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
    "wassce-2026-results-ghana": Wassce2026ResultsGhanaBody,
    "ghana-wage-system-ghc-60000-vs-ghc-21-77": GhanaWageSystemBody,
    "one-million-coders-ghana-tech-future": OneMillionCodersGhanaBody,
    "ai-tools-for-ghanaian-students-2026": AiToolsForGhanaianStudents2026Body,
    "ai-for-ghanaian-teachers": AiForGhanaianTeachersBody,
    "wassce-ai-study-guide": WassceAiStudyGuideBody,
    "ai-money-making-opportunities-ghana": AiMoneyMakingOpportunitiesGhanaBody,
    "facebook-tiktok-whatsapp-fact-checking": FacebookTiktokWhatsappFactCheckingBody,
    "african-youth-ai-future-jobs": AfricanYouthAiFutureJobsBody,
    "ghana-ai-future-opportunities-challenges": GhanaAiFutureOpportunitiesChallengesBody,
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
  return getRelatedRegistryBlogPosts(post, limit);
}

export function getBlogPostsByCategory(categoryName: string): BlogPostWithPath[] {
  return getAllBlogPosts().filter((p) => p.category === categoryName);
}

export function getBlogSitemapEntries(): { loc: string; lastmod: string }[] {
  return getBlogSitemapEntriesFromRegistry();
}
