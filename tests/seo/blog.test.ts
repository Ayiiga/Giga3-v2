import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BLOG_CATEGORIES, categorySlugForName } from "../../web/lib/blog/categories";
import { BLOG_POST_REGISTRY } from "../../web/lib/blog/postRegistry";
import { getAllBlogPosts, getBlogPostBySlug, getRelatedBlogPosts } from "../../web/lib/blog/posts";
import { blogArticleMetadata, blogIndexMetadata } from "../../web/lib/blog/metadata";

const WEB_ROOT = resolve(__dirname, "../../web");

describe("blog post registry", () => {
  it("has three launch articles with valid categories", () => {
    expect(BLOG_POST_REGISTRY).toHaveLength(3);
    const slugs = BLOG_POST_REGISTRY.map((p) => p.slug);
    expect(slugs).toContain("best-ai-tools-in-ghana-2026");
    expect(slugs).toContain("ai-for-bece-wassce-preparation-ghana");
    expect(slugs).toContain("top-ai-apps-in-ghana-2026");
    for (const post of BLOG_POST_REGISTRY) {
      expect(categorySlugForName(post.category)).toBeTruthy();
      expect(post.featuredImageAlt.length).toBeGreaterThan(10);
    }
  });

  it("exposes posts with hrefs and reading time", () => {
    const posts = getAllBlogPosts();
    expect(posts).toHaveLength(3);
    for (const post of posts) {
      expect(post.href).toBe(`/blog/${post.slug}/`);
      expect(post.readingTime).toMatch(/min read/);
    }
  });

  it("returns related posts by category and tags", () => {
    const current = getBlogPostBySlug("best-ai-tools-in-ghana-2026")!.post;
    const related = getRelatedBlogPosts(current, 2);
    expect(related.length).toBeGreaterThan(0);
    expect(related.every((p) => p.slug !== current.slug)).toBe(true);
  });
});

describe("blog metadata", () => {
  it("sets article openGraph type and canonical for posts", () => {
    const post = getAllBlogPosts()[0];
    const meta = blogArticleMetadata(post);
    expect(meta.alternates?.canonical).toBe(`/blog/${post.slug}/`);
    expect(meta.openGraph?.type).toBe("article");
    expect(meta.openGraph?.publishedTime).toContain(post.publishedAt);
  });

  it("sets unique blog index metadata", () => {
    const meta = blogIndexMetadata();
    expect(meta.title).toEqual({
      absolute: "Giga3 AI Blog — AI, Education & Technology in Ghana",
    });
    expect(meta.alternates?.canonical).toBe("/blog/");
  });
});

describe("blog routes (source)", () => {
  it("defines static article and category pages", () => {
    const articlePage = readFileSync(
      resolve(WEB_ROOT, "app/(marketing)/blog/[slug]/page.tsx"),
      "utf8"
    );
    expect(articlePage).toContain("generateStaticParams");
    expect(articlePage).toContain("generateMetadata");
    expect(articlePage).toContain("BlogArticleJsonLd");

    const categoryPage = readFileSync(
      resolve(WEB_ROOT, "app/(marketing)/blog/category/[categorySlug]/page.tsx"),
      "utf8"
    );
    expect(categoryPage).toContain("generateStaticParams");
    expect(BLOG_CATEGORIES).toHaveLength(7);
  });

  it("has not-found handling for invalid slugs", () => {
    const notFound = readFileSync(
      resolve(WEB_ROOT, "app/(marketing)/blog/[slug]/not-found.tsx"),
      "utf8"
    );
    expect(notFound).toContain("Article not found");
  });
});

describe("blog sitemap", () => {
  it("lists blog index and all article URLs", () => {
    const xml = readFileSync(resolve(WEB_ROOT, "public/sitemap-blog.xml"), "utf8");
    expect(xml).toContain("https://www.giga3ai.com/blog/");
    for (const post of getAllBlogPosts()) {
      expect(xml).toContain(`https://www.giga3ai.com${post.href}`);
    }
  });
});

describe("blog accessibility (source)", () => {
  it("blog cards and article layout use alt text and semantic structure", () => {
    const card = readFileSync(resolve(WEB_ROOT, "components/blog/BlogCard.tsx"), "utf8");
    expect(card).toContain("featuredImageAlt");
    expect(card).toContain("<article");

    const layout = readFileSync(resolve(WEB_ROOT, "components/blog/BlogHeader.tsx"), "utf8");
    expect(layout).toContain("<article");
    expect(layout).toContain("<header");
    expect(layout).toContain("page-title");
  });
});

describe("blog navigation", () => {
  it("includes Blog in header nav and footer links", () => {
    const site = readFileSync(resolve(WEB_ROOT, "lib/site.ts"), "utf8");
    expect(site).toContain('href: "/blog"');

    const productLinks = readFileSync(resolve(WEB_ROOT, "lib/seo/productLinks.ts"), "utf8");
    expect(productLinks).toContain('href: "/blog"');
  });
});
