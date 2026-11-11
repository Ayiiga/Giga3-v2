import { describe, expect, it } from "vitest";
import { blogPopularityLimit, formatBlogPopularity, publishedBlogSlugs } from "../../convex/blogPopularity";

describe("Giga3 AI blog popularity", () => {
  it("routes first-party popularity questions without taking general web searches", () => {
    expect(blogPopularityLimit("Please check the popular article on Giga3 AI blogs")).toBe(1);
    expect(blogPopularityLimit("Top 5 Giga3 AI blog posts")).toBe(5);
    expect(blogPopularityLimit("Most viewed articles on Giga3 AI's blog")).toBe(3);
    expect(blogPopularityLimit("What are popular AI blogs in Ghana?")).toBeNull();
    expect(blogPopularityLimit("Most popular Giga3 AI blog posts this week")).toBeNull();
  });

  it("ranks the published catalogue by recorded views and links to the article", () => {
    const slug = "dollar-to-cedi-usd-ghs-conversion-guide";
    expect(publishedBlogSlugs).toContain(slug);
    const reply = formatBlogPopularity({ [slug]: 25, "best-ai-tools-in-ghana-2026": 17, unpublished: 900 }, 1);
    expect(reply).toContain("25 recorded views");
    expect(reply).toContain(`https://www.giga3ai.com/blog/${slug}/`);
    expect(reply).not.toContain("900");
  });

  it("shows ties and explains when no ranking is available", () => {
    expect(formatBlogPopularity({ "best-ai-tools-in-ghana-2026": 5, "top-ai-apps-in-ghana-2026": 5 }, 1)).toContain("tied");
    expect(formatBlogPopularity(null, 1)).toContain("couldn’t verify");
    expect(formatBlogPopularity({}, 1)).toContain("https://www.giga3ai.com/blog/");
  });
});
