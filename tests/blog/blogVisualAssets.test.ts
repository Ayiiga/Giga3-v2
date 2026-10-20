import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BLOG_POST_REGISTRY } from "../../web/lib/blog/postRegistry";
import { validateBlogPosts } from "../../web/lib/blog/validation";

const root = resolve(__dirname, "../..");
const blogPublic = join(root, "web/public/images/blog");

describe("blog visual assets", () => {
  it("registry posts validate and point at existing JPEG featured images", () => {
    expect(() => validateBlogPosts([...BLOG_POST_REGISTRY])).not.toThrow();
    for (const post of BLOG_POST_REGISTRY) {
      expect(post.featuredImage.endsWith(".jpg")).toBe(true);
      expect(existsSync(join(root, "web/public", post.featuredImage.replace(/^\//, "")))).toBe(
        true
      );
      expect(post.featuredImageAlt.toLowerCase()).not.toContain("illustration of");
    }
  });

  it("every article body includes at least two supporting ArticleFigure images", () => {
    const contentDir = join(root, "web/content/blog");
    for (const file of readdirSync(contentDir).filter((f) => f.endsWith(".tsx"))) {
      const src = readFileSync(join(contentDir, file), "utf8");
      const figures = src.match(/<ArticleFigure[\s\S]*?\/>/g) ?? [];
      expect(figures.length, file).toBeGreaterThanOrEqual(2);
      for (const fig of figures) {
        expect(fig).toMatch(/alt="[^"]{12,}"/);
        expect(fig).toMatch(/src="\/images\/blog\/[^"]+\.jpg"/);
      }
    }
  });

  it("BlogImage and ArticleFigure reserve aspect ratio and support priority/lazy loading", () => {
    const blogImage = readFileSync(join(root, "web/components/blog/BlogImage.tsx"), "utf8");
    expect(blogImage).toContain("aspect-[16/9]");
    expect(blogImage).toContain("priority");
    expect(blogImage).toContain('loading={priority ? undefined : "lazy"}');
    expect(blogImage).toContain("decoding=\"async\"");
    expect(blogImage).toContain("object-cover");

    const figure = readFileSync(join(root, "web/components/seo/SeoArticleParts.tsx"), "utf8");
    expect(figure).toContain("BlogImage");
    expect(figure).toContain("figcaption");
  });

  it("blog public folder has generated JPG assets and no leftover SVG heroes", () => {
    const files = readdirSync(blogPublic);
    expect(files.some((f) => f.endsWith(".jpg"))).toBe(true);
    expect(files.filter((f) => f.endsWith(".svg"))).toEqual([]);
    expect(files).toContain("blog-hero.jpg");
  });
});
