import { describe, expect, it } from "vitest";
import {
  detectGigaSocialTemplateIntent,
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
    expect(addon).toContain("/gigaedit/?tab=video");
  });

  it("guides image edits honestly when chat or Media Studio may apply them", () => {
    const addon = mediaSystemPromptAddon("image_edit_request", {
      hasImageAttachment: true,
    });
    expect(addon).toContain("Media Studio");
    expect(addon).toContain("Never say the edit is done unless");
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

  it("keeps prose and photo edits out of video tooling", () => {
    expect(resolveMediaCapability({ query: "Create a short essay about Ghana" })).toBe("none");
    expect(resolveMediaCapability({ query: "Write a caption about our school" })).toBe("none");
    expect(resolveMediaCapability({ query: "Create a video script for my shop" })).toBe("none");
    expect(resolveMediaCapability({ query: "Crop this photo", hasImageAttachment: true })).toBe("image_edit_request");
    expect(resolveMediaCapability({ query: "Trim my video" })).toBe("video_timeline_edit");
    expect(resolveMediaCapability({ query: "Generate a video of the school" })).toBe("video_generate");
  });

  it("detects GigaSocial template remix intent", () => {
    expect(detectGigaSocialTemplateIntent("Make a video like this GigaSocial post")).toBe(true);
    expect(
      resolveMediaCapability({ query: "Make a video like this GigaSocial post" })
    ).toBe("gigasocial_template");
  });
});
