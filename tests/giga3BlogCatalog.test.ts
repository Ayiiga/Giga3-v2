import { describe, expect, it } from "vitest";
import {
  formatGiga3BlogContextBlock,
  matchGiga3BlogPosts,
} from "../convex/giga3BlogCatalog";

describe("giga3BlogCatalog", () => {
  it("matches BECE and WASSCE blog posts for exam preparation queries", () => {
    const posts = matchGiga3BlogPosts(
      "How can I use GigaLearn for BECE revision?"
    );

    expect(posts.length).toBeGreaterThan(0);
    expect(posts.some((p) => p.slug.includes("bece-wassce"))).toBe(true);
  });

  it("formats blog context for the system prompt", () => {
    const posts = matchGiga3BlogPosts("AI tools for Ghanaian students");
    const block = formatGiga3BlogContextBlock(posts);

    expect(block).toContain("GIGA3 AI BLOG ARTICLES");
    expect(block).toContain("https://www.giga3ai.com/blog/");
    expect(block).toContain("Do not paste raw JSON");
  });
});
