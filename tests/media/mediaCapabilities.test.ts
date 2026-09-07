import { describe, expect, it } from "vitest";
import {
  detectMediaToolsQuestion,
  mediaSystemPromptAddon,
  mediaToolsOverviewTemplate,
  resolveMediaCapability,
} from "../../convex/mediaCapabilities";

describe("mediaCapabilities", () => {
  it("detects can-you-edit-videos-or-pictures style questions", () => {
    expect(detectMediaToolsQuestion("Can you edit videos or pictures?")).toBe(true);
    expect(detectMediaToolsQuestion("Can you edit videos here")).toBe(true);
    expect(detectMediaToolsQuestion("Explain photosynthesis")).toBe(false);
  });

  it("resolves tools_overview for capability questions", () => {
    expect(
      resolveMediaCapability({ query: "Can you edit videos or pictures?" })
    ).toBe("tools_overview");
  });

  it("resolves video_file_attached when a video is uploaded", () => {
    expect(
      resolveMediaCapability({
        query: "What's in this clip?",
        hasVideoAttachment: true,
      })
    ).toBe("video_file_attached");
  });

  it("includes the helpful overview template and safety rules in the prompt addon", () => {
    const addon = mediaSystemPromptAddon("tools_overview");
    expect(addon).toContain("Absolutely!");
    expect(addon).toContain("Background removal or replacement");
    expect(addon).toContain("Never claim an edit");
    expect(addon).toContain("Upload privacy");
    expect(addon).toContain("/media?tab=image");
    expect(addon).toContain("/gigaedit/");
  });

  it("guides image edits to Media Studio without claiming chat edits pixels", () => {
    const addon = mediaSystemPromptAddon("image_edit_request", {
      hasImageAttachment: true,
    });
    expect(addon).toContain("Media Studio");
    expect(addon).toContain("Never say the edit is done");
  });

  it("builds overview template with studio links", () => {
    const text = mediaToolsOverviewTemplate({
      imageStudio: true,
      videoStudio: true,
      gigaEdit: true,
      chatImageGenerate: true,
      chatImageAnalyze: true,
    });
    expect(text).toContain("Media Studio");
    expect(text).toContain("GigaEdit");
  });
});
