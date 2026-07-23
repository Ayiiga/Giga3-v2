import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("GigaSocial composer compactness", () => {
  it("uses compact sheet height and passes compact to composer", () => {
    const sheet = readFileSync(
      resolve(__dirname, "../../web/components/gigasocial/GigaSocialComposerSheet.tsx"),
      "utf8"
    );
    expect(sheet).toContain("85svh");
    expect(sheet).toContain("compact");
    expect(sheet).not.toContain("92dvh");
  });

  it("supports compact AI and templates without always expanding", () => {
    const ai = readFileSync(
      resolve(__dirname, "../../web/components/gigasocial/ai/GigaSocialAIAssistant.tsx"),
      "utf8"
    );
    const templates = readFileSync(
      resolve(__dirname, "../../web/components/gigasocial/feed/CreatorTemplateQuickPick.tsx"),
      "utf8"
    );
    expect(ai).toContain("compact = false");
    expect(ai).toContain("AI assist");
    expect(templates).toContain("compact = false");
    expect(templates).toContain('aria-expanded={open}');
  });

  it("does not use smooth scroll on the compact feed panel", () => {
    const css = readFileSync(
      resolve(__dirname, "../../web/styles/gigasocial-pro.css"),
      "utf8"
    );
    const block =
      css.match(/\.gigasocial-feed-panel-compact \{[\s\S]*?\}/)?.[0] ?? "";
    expect(block).toContain("scroll-behavior: auto");
    expect(block).not.toContain("scroll-behavior: smooth");
  });
});

describe("GigaSocial creator post edit", () => {
  it("shows edit for own posts without requiring AI editing flag", () => {
    const card = readFileSync(
      resolve(__dirname, "../../web/components/gigasocial/GigaSocialPostCard.tsx"),
      "utf8"
    );
    expect(card).toContain("enableEdit = true");
    expect(card).toContain("canDelete && enableEdit && onEdit");
    const feed = readFileSync(
      resolve(__dirname, "../../web/components/gigasocial/GigaSocialFeedPanel.tsx"),
      "utf8"
    );
    expect(feed).not.toContain("enableEdit={features.enableAIEditing}");
  });

  it("matches ownership by handle or userId on the feed", () => {
    const feed = readFileSync(
      resolve(__dirname, "../../web/components/gigasocial/GigaSocialFeedPanel.tsx"),
      "utf8"
    );
    expect(feed).toContain("post.author.handle === myHandle");
    expect(feed).toContain("post.author.userId === getUserEmail()");
    expect(feed).toContain("enableEdit");
    expect(feed).not.toContain("enableEdit={features.enableAIEditing}");
  });
});
