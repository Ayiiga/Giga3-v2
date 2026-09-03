import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GIGA3_CHAT_PRODUCTS, GIGA3_PRODUCT_ROUTING_RULES } from "../../convex/giga3Products";
import { composeSystemPrompt } from "../../convex/assistantIdentity";
import { siteConfig } from "../../web/lib/site";
import {
  buildProductRedirectAnswer,
  extractProductRedirectsFromText,
  isInternalGiga3Href,
  matchProductRedirectIntent,
} from "../../web/lib/chat/productRedirects";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("matchProductRedirectIntent", () => {
  it("navigates on explicit open / go to / take me to", () => {
    expect(matchProductRedirectIntent("Open GigaSocial")?.product.id).toBe("gigasocial");
    expect(matchProductRedirectIntent("Open GigaSocial")?.kind).toBe("navigate");
    expect(matchProductRedirectIntent("take me to GigaEdits")?.product.id).toBe("gigaedit");
    expect(matchProductRedirectIntent("go to GigaLearn")?.product.id).toBe("gigalearn");
    expect(matchProductRedirectIntent("launch Media Studio")?.product.id).toBe("media");
    expect(matchProductRedirectIntent("please open marketplace")?.product.id).toBe(
      "marketplace"
    );
    expect(matchProductRedirectIntent("redirect me to Video AI")?.product.id).toBe("video");
  });

  it("suggests when the user asks where / how to open an app", () => {
    const where = matchProductRedirectIntent("Where is GigaSocial?");
    expect(where?.product.id).toBe("gigasocial");
    expect(where?.kind).toBe("suggest");
    expect(matchProductRedirectIntent("How do I open Media Studio?")?.kind).toBe("suggest");
    expect(matchProductRedirectIntent("I want to use GigaLearn")?.product.id).toBe(
      "gigalearn"
    );
  });

  it("suggests task shortcuts without sending the user away automatically", () => {
    expect(matchProductRedirectIntent("I want to generate an image")?.product.id).toBe(
      "media"
    );
    expect(matchProductRedirectIntent("create a video")?.product.id).toBe("video");
    expect(matchProductRedirectIntent("edit a video clip")?.product.id).toBe("gigaedit");
    expect(matchProductRedirectIntent("post to GigaSocial")?.product.id).toBe("gigasocial");
    expect(matchProductRedirectIntent("I want to generate an image")?.kind).toBe("suggest");
  });

  it("does not intercept homework, writing, or multi-step prompts", () => {
    expect(
      matchProductRedirectIntent("Open GigaSocial and then draft an essay about it")
    ).toBe(null);
    expect(
      matchProductRedirectIntent("Help me write a social media caption for my shop")
    ).toBe(null);
    expect(matchProductRedirectIntent("Explain how to generate an image in Python")).toBe(
      null
    );
    expect(matchProductRedirectIntent("Help me solve 2x + 3 = 7 step by step")).toBe(null);
  });

  it("ignores long or empty messages", () => {
    expect(matchProductRedirectIntent("")).toBe(null);
    expect(matchProductRedirectIntent("Open GigaSocial " + "please ".repeat(40))).toBe(
      null
    );
  });
});

describe("product redirect answers and link extraction", () => {
  it("builds a markdown open link for local replies", () => {
    const match = matchProductRedirectIntent("Open GigaLearn");
    expect(match).not.toBeNull();
    const answer = buildProductRedirectAnswer(match!);
    expect(answer).toContain("**GigaLearn**");
    expect(answer).toContain("[Open GigaLearn](/gigalearn/)");
  });

  it("extracts unique products from assistant markdown", () => {
    const products = extractProductRedirectsFromText(
      "Try [Open GigaSocial](/gigasocial/) or [Open Media Studio](/media/)."
    );
    expect(products.map((p) => p.id)).toEqual(["gigasocial", "media"]);
  });

  it("treats /gigaedits/ as GigaEdits", () => {
    const products = extractProductRedirectsFromText("[Editor](/gigaedits/)");
    expect(products.map((p) => p.id)).toEqual(["gigaedit"]);
  });

  it("treats same-origin Giga3 paths as internal", () => {
    expect(isInternalGiga3Href("/gigasocial/")).toBe(true);
    expect(isInternalGiga3Href("https://www.giga3ai.com/media/")).toBe(true);
    expect(isInternalGiga3Href("https://example.com/phish")).toBe(false);
  });
});

describe("catalog stays aligned with the live site", () => {
  it("uses trailing-slash hrefs that match siteConfig", () => {
    const byId = Object.fromEntries(GIGA3_CHAT_PRODUCTS.map((p) => [p.id, p.href]));
    expect(byId.gigasocial).toBe(siteConfig.links.gigasocial);
    expect(byId.gigaedit).toBe(`${siteConfig.links.gigaedit}/`);
    expect(byId.gigalearn).toBe(`${siteConfig.links.gigalearn}/`);
    expect(byId.media).toBe(`${siteConfig.links.media}/`);
    expect(byId.marketplace).toBe(`${siteConfig.links.marketplace}/`);
    expect(byId.video).toBe(`${siteConfig.links.video}/`);
  });

  it("includes routing rules in every system prompt", () => {
    expect(GIGA3_PRODUCT_ROUTING_RULES).toContain("[Open GigaSocial](/gigasocial/)");
    expect(composeSystemPrompt("Mode: test")).toContain(GIGA3_PRODUCT_ROUTING_RULES);
  });
});

describe("chat product redirect wiring", () => {
  it("intercepts product opens in ChatShell before the AI send path", () => {
    const shell = read("web/components/chat/ChatShell.tsx");
    expect(shell).toContain("matchProductRedirectIntent");
    expect(shell).toContain("buildProductRedirectAnswer");
    expect(shell).toContain("router.push(product.product.href)");
    const sendBlock = shell.slice(shell.indexOf("const handleSend"));
    const deviceIdx = sendBlock.indexOf("resolveLocalDeviceAnswer");
    const productIdx = sendBlock.indexOf("matchProductRedirectIntent");
    expect(productIdx).toBeGreaterThan(-1);
    expect(productIdx).toBeLessThan(deviceIdx);
  });

  it("renders open cards on assistant bubbles and same-tab internal links", () => {
    expect(read("web/components/chat/MessageBubble.tsx")).toContain("ProductRedirectCards");
    expect(read("web/components/chat/MessageBubble.tsx")).toContain(
      "extractProductRedirectsFromText"
    );
    expect(read("web/components/chat/MessageMarkdown.tsx")).toContain("isInternalGiga3Href");
    expect(read("web/components/chat/ChatGuestBrowseView.tsx")).toContain(
      "matchProductRedirectIntent"
    );
    expect(read("web/components/chat/MessageList.tsx")).toContain(
      "CHAT_WORKSPACE_PRIMARY_APPS"
    );
  });
});
