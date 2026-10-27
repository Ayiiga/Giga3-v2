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
import { ChatgptVsGeminiVsClaudeGhana2026Body } from "@/content/blog/chatgpt-vs-gemini-vs-claude-ghana-2026";
import { MakeMoneyWithAiGhana2026Body } from "@/content/blog/make-money-with-ai-ghana-2026";
import { AfricaAiThatSolvesRealProblemsBody } from "@/content/blog/africa-ai-that-solves-real-problems";
import { HowToStartLearningCodingInGhanaBody } from "@/content/blog/how-to-start-learning-coding-in-ghana";
import { OneMillionCodersCoursesSkillsCareersBody } from "@/content/blog/one-million-coders-ghana-courses-skills-careers";
import { AiSkillsEveryGhanaianStudent2026Body } from "@/content/blog/ai-skills-every-ghanaian-student-should-learn-2026";
import { CodingVsAiBeginnersBody } from "@/content/blog/coding-vs-ai-which-skill-beginners-learn-first";
import { HowToBuildFirstSoftwareProjectBody } from "@/content/blog/how-to-build-first-software-project-beginner-ghana";
import { DeepaiGuideBody } from "@/content/blog/deepai-guide";
import { ChatgptZeroZerogptExplainedBody } from "@/content/blog/chatgpt-zero-zerogpt-explained";
import { PhotoroomAiTutorialBody } from "@/content/blog/photoroom-ai-tutorial";
import { ClaudeAiLoginGuideBody } from "@/content/blog/claude-ai-login-guide";
import { GeminiAiLoginGuideBody } from "@/content/blog/gemini-ai-login-guide";
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
    "chatgpt-vs-gemini-vs-claude-ghana-2026": ChatgptVsGeminiVsClaudeGhana2026Body,
    "make-money-with-ai-ghana-2026": MakeMoneyWithAiGhana2026Body,
    "africa-ai-that-solves-real-problems": AfricaAiThatSolvesRealProblemsBody,
    "how-to-start-learning-coding-in-ghana": HowToStartLearningCodingInGhanaBody,
    "one-million-coders-ghana-courses-skills-careers": OneMillionCodersCoursesSkillsCareersBody,
    "ai-skills-every-ghanaian-student-should-learn-2026": AiSkillsEveryGhanaianStudent2026Body,
    "coding-vs-ai-which-skill-beginners-learn-first": CodingVsAiBeginnersBody,
    "how-to-build-first-software-project-beginner-ghana": HowToBuildFirstSoftwareProjectBody,
    "deepai-guide": DeepaiGuideBody,
    "chatgpt-zero-zerogpt-explained": ChatgptZeroZerogptExplainedBody,
    "photoroom-ai-tutorial": PhotoroomAiTutorialBody,
    "claude-ai-login-guide": ClaudeAiLoginGuideBody,
    "gemini-ai-login-guide": GeminiAiLoginGuideBody,
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
