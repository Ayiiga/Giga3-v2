import { describe, expect, it } from "vitest";
import {
  blogPushDedupeKey,
  buildBlogArticlePushPayload,
  shouldSendBlogPush,
} from "../../web/lib/blog/blogPushNotifyPayload";

describe("blogPushNotifyPayload", () => {
  it("builds title, summary, canonical URL, and branding data", () => {
    const payload = buildBlogArticlePushPayload({
      slug: "best-ai-tools-in-ghana-2026",
      title: "Best AI Tools in Ghana (2026)",
      summary: "Practical AI tools for students, creators, and businesses in Ghana.",
      imageUrl: "/images/blog/best-ai-tools.png",
    });
    expect(payload).not.toBeNull();
    expect(payload!.headings.en).toContain("Best AI Tools");
    expect(payload!.contents.en).toContain("Practical AI tools");
    expect(payload!.url).toBe("https://www.giga3ai.com/blog/best-ai-tools-in-ghana-2026/");
    expect(payload!.data).toEqual({
      type: "giga3_blog_article",
      slug: "best-ai-tools-in-ghana-2026",
      brand: "Giga3 AI",
    });
    expect(payload!.chrome_web_image).toBe(
      "https://www.giga3ai.com/images/blog/best-ai-tools.png"
    );
    expect(payload!.external_id).toBe("blog:best-ai-tools-in-ghana-2026");
  });

  it("rejects unsafe click URLs via approved-domain validation", () => {
    // Slug alone is always mapped to www.giga3ai.com — spoofing requires failing origin check helper.
    const payload = buildBlogArticlePushPayload({
      slug: "x",
      title: "X",
      summary: "Y",
      siteOrigin: "https://evil.example",
    });
    expect(payload).toBeNull();
  });

  it("clips long titles and summaries", () => {
    const payload = buildBlogArticlePushPayload({
      slug: "long",
      title: "T".repeat(120),
      summary: "S".repeat(200),
    });
    expect(payload!.headings.en.length).toBeLessThanOrEqual(80);
    expect(payload!.contents.en.length).toBeLessThanOrEqual(140);
  });

  it("prevents duplicate sends and skips drafts/previews", () => {
    const slug = "ai-for-ghanaian-teachers";
    const key = blogPushDedupeKey(slug);
    expect(shouldSendBlogPush({ slug, previouslySentKeys: [] })).toBe(true);
    expect(shouldSendBlogPush({ slug, previouslySentKeys: [key] })).toBe(false);
    expect(shouldSendBlogPush({ slug, previouslySentKeys: [], isDraft: true })).toBe(false);
    expect(shouldSendBlogPush({ slug, previouslySentKeys: [], isPreview: true })).toBe(false);
  });
});
