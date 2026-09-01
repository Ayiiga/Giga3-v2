import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { publicMetadata } from "../../web/lib/seo/publicMetadata";
import { GIGA3_PRODUCT_LINKS, FOOTER_PRODUCT_LINKS } from "../../web/lib/seo/productLinks";
import {
  gigaSocialPostPath,
  gigaSocialProfilePath,
  marketplaceItemPath,
} from "../../web/lib/seo/publicPaths";
import { parsePostId, parseProfileHandle } from "../../web/lib/gigasocial/profileRoute";

describe("publicMetadata", () => {
  it("sets canonical path and indexable robots by default", () => {
    const meta = publicMetadata({
      path: "/gigalearn",
      title: "GigaLearn — AI Tutor",
      description: "Learning support for students in Ghana.",
    });
    expect(meta.alternates?.canonical).toBe("/gigalearn/");
    expect(meta.robots).toEqual({ index: true, follow: true });
    expect(meta.openGraph?.url).toBe("https://www.giga3ai.com/gigalearn/");
  });

  it("allows noindex when index is false", () => {
    const meta = publicMetadata({
      path: "/chat/login",
      title: "Sign in",
      description: "Sign in to Giga3 AI",
      index: false,
    });
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it("avoids duplicating Giga3 AI in social title when already present", () => {
    const meta = publicMetadata({
      path: "/",
      title: "Giga3 AI — Africa's AI Super App",
      description: "Super app description.",
    });
    expect(meta.openGraph?.title).toBe("Giga3 AI — Africa's AI Super App");
    expect(meta.title).toEqual({ absolute: "Giga3 AI — Africa's AI Super App" });
  });

  it("uses title template for pages without Giga3 in the title", () => {
    const meta = publicMetadata({
      path: "/gigalearn",
      title: "GigaLearn — AI Tutor",
      description: "Learning support.",
    });
    expect(meta.title).toBe("GigaLearn — AI Tutor");
  });
});

describe("sitemap.xml", () => {
  it("lists major public product routes", () => {
    const xml = readFileSync(resolve(__dirname, "../../web/public/sitemap.xml"), "utf8");
    for (const path of [
      "https://www.giga3ai.com/",
      "https://www.giga3ai.com/chat/",
      "https://www.giga3ai.com/gigasocial/",
      "https://www.giga3ai.com/gigaedit/",
      "https://www.giga3ai.com/media/",
      "https://www.giga3ai.com/video/",
      "https://www.giga3ai.com/gigalearn/",
      "https://www.giga3ai.com/marketplace/",
      "https://www.giga3ai.com/creator-studio/",
      "https://www.giga3ai.com/discover/",
      "https://www.giga3ai.com/trending/",
      "https://www.giga3ai.com/prompts/",
      "https://www.giga3ai.com/enterprise/",
      "https://www.giga3ai.com/developers/",
      "https://www.giga3ai.com/legal/privacy/",
    ]) {
      expect(xml).toContain(path);
    }
  });
});

describe("robots.txt", () => {
  it("allows chat landing while blocking login and seller tools", () => {
    const robots = readFileSync(resolve(__dirname, "../../web/public/robots.txt"), "utf8");
    expect(robots).toContain("Allow: /chat/");
    expect(robots).toContain("Disallow: /chat/login/");
    expect(robots).toContain("Disallow: /chat/login/reset/");
    expect(robots).not.toContain("Disallow: /creator-studio/");
    expect(robots).toContain("Disallow: /marketplace/sell/");
    expect(robots).toContain("Sitemap: https://www.giga3ai.com/sitemap.xml");
  });
});

describe("productLinks", () => {
  it("includes core ecosystem destinations", () => {
    const hrefs = GIGA3_PRODUCT_LINKS.map((l) => l.href);
    expect(hrefs).toContain("/chat");
    expect(hrefs).toContain("/media");
    expect(hrefs).toContain("/gigaedit");
    expect(hrefs).toContain("/discover");
    expect(hrefs).toContain("/video");
    expect(hrefs).toContain("/enterprise");
  });

  it("footer links cover indexable ecosystem pages", () => {
    const hrefs = FOOTER_PRODUCT_LINKS.map((l) => l.href);
    for (const path of ["/video", "/trending", "/prompts", "/developers", "/enterprise"]) {
      expect(hrefs).toContain(path);
    }
  });
});

describe("publicPaths", () => {
  it("builds canonical marketplace and GigaSocial paths", () => {
    expect(marketplaceItemPath("abc123")).toBe("/marketplace/item/abc123/");
    expect(gigaSocialPostPath("post1")).toBe("/gigasocial/post/post1/");
    expect(gigaSocialProfilePath("@Creator")).toBe("/gigasocial/profile/creator/");
  });
});

describe("gigasocial route parsing", () => {
  it("reads ids from path segments and query params", () => {
    expect(parsePostId("/gigasocial/post/abc/", "")).toBe("abc");
    expect(parsePostId("/gigasocial/post/", "id=xyz")).toBe("xyz");
    expect(parseProfileHandle("/gigasocial/profile/creator/", "")).toBe("creator");
    expect(parseProfileHandle("/gigasocial/profile/", "handle=@User")).toBe("user");
  });
});
