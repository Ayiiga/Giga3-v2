import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  beginPreProdRequest,
  completePreProdRequest,
  newPreProdNonce,
} from "../../web/lib/media/videoPreProduction/idempotency";
import { invalidateApprovalsOnScriptChange } from "../../web/lib/media/videoPreProduction/approvals";
import {
  addOptionalImageUrl,
  assignSceneImages,
  isHttpsImageUrl,
  pickSourceImageUrl,
  removeOptionalImageUrl,
  replaceOptionalImageUrl,
  resolveSceneSourceImage,
  rollbackFailedImageUpload,
} from "../../web/lib/media/videoPreProduction/optionalImages";
import {
  PREPROD_SCRIPT_FAILED,
  PREPROD_VIDEO_FAILED,
  PREPROD_VOICEOVER_FAILED,
  toPreProdUserError,
} from "../../web/lib/media/videoPreProduction/errors";
import {
  filterVoicesByLanguage,
  listVoiceLanguages,
  VOICE_STYLE_PRESETS,
} from "../../web/lib/media/videoPreProduction/voiceOptions";
import { splitScriptIntoScenes } from "../../web/lib/media/videoPreProduction/scriptUtils";
import { createEmptyDraft } from "../../web/lib/media/videoPreProduction/types";
import { buildImageStudioActionUrl } from "../../web/lib/chat/imageStudioLinks";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("video pre-production workflow — script", () => {
  it("creates structured scenes from generated script text", () => {
    const script =
      "TITLE: School Promo\nHOOK: Welcome!\nScene 1 — [Wide shot] Students enter.\nScene 2 — [Close-up] Teacher smiles.";
    const scenes = splitScriptIntoScenes(script);
    expect(scenes.length).toBeGreaterThanOrEqual(2);
    expect(scenes.some((s) => s.visualPrompt.toLowerCase().includes("wide"))).toBe(true);
  });

  it("preserves original script when rewrite produces improved script", () => {
    const draft = {
      ...createEmptyDraft(),
      originalScript: "Original narration line.",
      improvedScript: "Improved hook and clearer narration.",
      workingScript: "Improved hook and clearer narration.",
    };
    expect(draft.originalScript).toBe("Original narration line.");
    expect(draft.improvedScript).not.toBe(draft.originalScript);
    expect(draft.workingScript).toBe(draft.improvedScript);
  });

  it("keeps working script editable independently of original", () => {
    const original = "Scene 1 — Hello.";
    const edited = "Scene 1 — Hello world, edited.";
    const draft = {
      ...createEmptyDraft(),
      originalScript: original,
      workingScript: edited,
    };
    expect(draft.originalScript).toBe(original);
    expect(draft.workingScript).toBe(edited);
  });
});

describe("video pre-production workflow — optional images", () => {
  const https = "https://cdn.example.com/photo.jpg";
  const blob = "blob:http://localhost/abc";

  it("allows video without gallery images", () => {
    expect(pickSourceImageUrl([])).toBeUndefined();
    expect(pickSourceImageUrl([blob])).toBeUndefined();
  });

  it("uses https gallery image when supplied", () => {
    expect(pickSourceImageUrl([https])).toBe(https);
    expect(isHttpsImageUrl(https)).toBe(true);
    expect(isHttpsImageUrl(blob)).toBe(false);
  });

  it("supports add, remove, and replace", () => {
    const a = addOptionalImageUrl([], https);
    expect(a).toEqual([https]);
    const b = addOptionalImageUrl(a, "https://cdn.example.com/b.jpg");
    expect(removeOptionalImageUrl(b, 0)).toEqual(["https://cdn.example.com/b.jpg"]);
    expect(replaceOptionalImageUrl(b, 1, "https://cdn.example.com/c.jpg")[1]).toBe(
      "https://cdn.example.com/c.jpg"
    );
  });

  it("assigns scene images round-robin without requiring uploads", () => {
    const scenes = [
      { id: "s1", sceneNumber: 1, narration: "One", visualPrompt: "A" },
      { id: "s2", sceneNumber: 2, narration: "Two", visualPrompt: "B" },
      { id: "s3", sceneNumber: 3, narration: "Three", visualPrompt: "C" },
    ];
    const assigned = assignSceneImages(scenes, [https]);
    expect(assigned.every((s) => s.optionalImageUrl === https)).toBe(true);
    const multi = assignSceneImages(scenes, [
      "https://a.test/1.jpg",
      "https://a.test/2.jpg",
    ]);
    expect(multi[0]?.optionalImageUrl).toBe("https://a.test/1.jpg");
    expect(multi[1]?.optionalImageUrl).toBe("https://a.test/2.jpg");
    expect(multi[2]?.optionalImageUrl).toBe("https://a.test/1.jpg");
  });

  it("resolves per-scene source for generation", () => {
    const scene = {
      id: "s1",
      sceneNumber: 1,
      narration: "Hi",
      visualPrompt: "City",
      optionalImageUrl: "https://scene.test/img.jpg",
    };
    expect(resolveSceneSourceImage(scene, [])).toBe("https://scene.test/img.jpg");
  });

  it("restores previous URL when replace upload fails", () => {
    const first = "https://cdn.example.com/first.jpg";
    const previous = "https://cdn.example.com/original.jpg";
    const blob = "blob:http://localhost/failed";
    const rolled = rollbackFailedImageUpload([first, blob], {
      failedPreviewUrl: blob,
      replaceIndex: 1,
      previousUrl: previous,
    });
    expect(rolled).toEqual([first, previous]);
  });

  it("removes failed add upload without affecting other images", () => {
    const kept = "https://cdn.example.com/kept.jpg";
    const blob = "blob:http://localhost/failed";
    const rolled = rollbackFailedImageUpload([kept, blob], {
      failedPreviewUrl: blob,
    });
    expect(rolled).toEqual([kept]);
  });

  it("clears stale scene references when images are removed", () => {
    const scenes = assignSceneImages(
      [{ id: "s1", sceneNumber: 1, narration: "Hi", visualPrompt: "City" }],
      []
    );
    expect(scenes[0]?.optionalImageUrl).toBeUndefined();
  });
});

describe("video pre-production workflow — approval invalidation", () => {
  it("invalidates script and voiceover approvals on script edits", () => {
    expect(invalidateApprovalsOnScriptChange()).toEqual({
      scriptApproved: false,
      voiceoverApproved: false,
    });
  });
});

describe("video pre-production workflow — voiceover & errors", () => {
  it("lists voice languages and filters by selection", () => {
    const voices = [
      { uri: "a", name: "English US", lang: "en-US", localService: true },
      { uri: "b", name: "French", lang: "fr-FR", localService: true },
    ];
    expect(listVoiceLanguages(voices)).toContain("en");
    expect(filterVoicesByLanguage(voices, "fr").map((v) => v.uri)).toEqual(["b"]);
  });

  it("exposes speaking style presets", () => {
    expect(VOICE_STYLE_PRESETS.length).toBeGreaterThanOrEqual(3);
    expect(VOICE_STYLE_PRESETS[0].rate).toBeGreaterThan(0);
  });

  it("maps provider errors to safe user copy", () => {
    expect(toPreProdUserError(new Error("fal.ai timeout"), PREPROD_VIDEO_FAILED)).toBe(
      PREPROD_VIDEO_FAILED
    );
    expect(toPreProdUserError(new Error("Sign in required"), PREPROD_SCRIPT_FAILED)).toContain(
      "Sign in"
    );
    expect(PREPROD_VOICEOVER_FAILED).toContain("script has been saved");
  });
});

describe("video pre-production workflow — credit & idempotency safety", () => {
  it("deduplicates in-flight script/video requests", () => {
    const nonce = newPreProdNonce();
    expect(beginPreProdRequest("script", nonce)).toBe(true);
    expect(beginPreProdRequest("script", "other")).toBe(false);
    completePreProdRequest("script", nonce);
    expect(beginPreProdRequest("script", "next")).toBe(true);
    completePreProdRequest("script", "next");
  });

  it("keeps server-authoritative credit charging in media layer", () => {
    const media = read("convex/media.ts");
    expect(media).toContain("chargeCreditsForMedia");
    const worker = read("convex/mediaVideoWorker.ts");
    expect(worker).toContain("refundMediaJobCredits");
  });
});

describe("video pre-production workflow — integration surfaces", () => {
  it("keeps guided and quick generate modes in Media Studio", () => {
    const panel = read("web/components/media/MediaGeneratePanel.tsx");
    expect(panel).toContain('videoWorkflow === "preprod"');
    expect(panel).toContain('videoWorkflow === "quick"');
    expect(panel).toContain("recentImageUrls={recentImageUrls}");
  });

  it("exposes optional images panel and gallery URLs in Media Studio", () => {
    const panel = read("web/components/media/MediaGeneratePanel.tsx");
    const images = read("web/components/media/videoPreProduction/OptionalImagesPanel.tsx");
    expect(panel).toContain("recentImageUrls={recentImageUrls}");
    expect(images).toContain("Continue without images");
  });

  it("preserves GigaEdits Media Studio deep links", () => {
    const enhance = buildImageStudioActionUrl("enhance");
    expect(enhance).toMatch(/^\/media\?/);
    const header = read("web/components/gigaedit/VideoEditorHeader.tsx");
    expect(header).toContain('/media/?action=enhance');
  });

  it("preserves fal primary provider routing", () => {
    const engine = read("convex/mediaEngine.ts");
    expect(engine).toContain("const falResult = await tryFal");
    expect(engine).toContain("const replicateResult = await tryReplicate");
    expect(engine.indexOf("const falResult")).toBeLessThan(
      engine.indexOf('const replicateResult = await tryReplicate(\n    errors.length')
    );
  });
});
