import { describe, expect, it } from "vitest";
import {
  buildTemplateHandoffFromPost,
  buildTemplatePrompt,
  templateStudioHref,
} from "../../web/lib/gigasocial/templateHandoff";
import { canShowTemplateButton } from "../../web/lib/gigasocial/templateVisibility";

const samplePost = {
  _id: "post123",
  body: "Test",
  author: { handle: "kwame", displayName: "Kwame" },
  postType: "video" as const,
  mediaType: "video" as const,
  likeCount: 0,
  commentCount: 0,
  shareCount: 0,
};

describe("templateHandoff", () => {
  it("builds generate URLs without source media", () => {
    const payload = buildTemplateHandoffFromPost(samplePost, "video", "My idea");
    expect(templateStudioHref(payload)).toBe(
      "/media?tab=video&templatePost=post123&templateMode=video"
    );
    expect(templateStudioHref({ ...payload, mode: "image" })).toContain("action=generate");
    expect(templateStudioHref({ ...payload, mode: "full" })).toBe(
      "/gigaedit/?tab=video&templatePost=post123&templateMode=full"
    );
    expect(templateStudioHref({ ...payload, mode: "sound" })).toContain("compose=template");
  });

  it("includes originality constraints in prompt", () => {
    const payload = buildTemplateHandoffFromPost(samplePost, "full", "Ghana comedy");
    const prompt = buildTemplatePrompt({
      ...payload,
      sceneStructure: ["Hook", "Payoff"],
      visualStyle: "Vertical short-form",
    });
    expect(prompt).toContain("Ghana comedy");
    expect(prompt).toContain("Inspired by a GigaSocial template by @kwame.");
    expect(prompt).toContain("Do not copy");
    expect(prompt).toContain("Hook → Payoff");
  });
});

describe("templateVisibility", () => {
  it("hides button when policy is off for non-owners", () => {
    expect(
      canShowTemplateButton({ ...samplePost, templatePolicy: "off" }, "viewer@x.com")
    ).toBe(false);
  });

  it("shows button for owner even when policy is off", () => {
    expect(
      canShowTemplateButton(
        { ...samplePost, templatePolicy: "off", author: { ...samplePost.author, userId: "me@x.com" } },
        "me@x.com"
      )
    ).toBe(true);
  });
});
