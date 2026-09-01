import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { publicMetadata } from "../../web/lib/seo/publicMetadata";
import { GIGA3_PRODUCT_LINKS } from "../../web/lib/seo/productLinks";

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
      "https://www.giga3ai.com/gigalearn/",
      "https://www.giga3ai.com/marketplace/",
      "https://www.giga3ai.com/creator-studio/",
      "https://www.giga3ai.com/discover/",
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
  });
});
