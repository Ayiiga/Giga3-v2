import { describe, expect, it } from "vitest";
import {
  buildSceneGenerationPrompt,
  MEDIA_STUDIO_VIDEO_CAPABILITIES,
} from "../../web/lib/media/videoProject/cinematicPrompt";
import {
  createDefaultConsistencyProfile,
  DEFAULT_GENERATION_SETTINGS,
} from "../../web/lib/media/videoProject/types";
import {
  duplicateScene,
  planScenesFromPrompt,
  reorderScenes,
} from "../../web/lib/media/videoProject/sceneDirector";
import {
  createTextOverlay,
  normalizeOverlayText,
  suggestedTitleOverlaysFromPrompt,
  validateOverlayTextExact,
} from "../../web/lib/media/videoProject/textOverlays";
import {
  runVideoProjectQualityCheck,
  estimateProjectCredits,
} from "../../web/lib/media/videoProject/qualityCheck";
import {
  beginSceneGeneration,
  completeSceneGeneration,
  newGenerationNonce,
} from "../../web/lib/media/videoProject/idempotency";
import { parseLocationFromPrompt } from "../../web/lib/media/videoProject/locationContext";

describe("sceneDirector", () => {
  it("splits a future Accra prompt into multiple editable scenes", () => {
    const result = planScenesFromPrompt({
      masterPrompt: "Create a cinematic video showing Accra in 2050",
    });
    expect(result.scenes.length).toBeGreaterThanOrEqual(3);
    expect(result.detectedLocation?.city).toBe("Accra");
    expect(result.scenes[0].prompt.length).toBeGreaterThan(10);
  });

  it("reorders scenes without losing ids", () => {
    const result = planScenesFromPrompt({
      masterPrompt: "Scene 1: Opening\nScene 2: Middle\nScene 3: End",
    });
    expect(result.scenes.length).toBeGreaterThanOrEqual(3);
    const reordered = reorderScenes(result.scenes, 0, 2);
    expect(reordered).toHaveLength(result.scenes.length);
    expect(reordered[0].order).toBe(0);
    expect(reordered[reordered.length - 1].order).toBe(reordered.length - 1);
  });

  it("duplicates a scene with fresh id and idle status", () => {
    const { scenes } = planScenesFromPrompt({ masterPrompt: "Test scene" });
    const copy = duplicateScene(scenes[0], 1);
    expect(copy.id).not.toBe(scenes[0].id);
    expect(copy.status).toBe("idle");
    expect(copy.outputUrl).toBeUndefined();
  });
});

describe("cinematicPrompt", () => {
  it("only exposes provider-supported aspect ratios and durations", () => {
    expect(MEDIA_STUDIO_VIDEO_CAPABILITIES.aspects).toEqual(["16:9", "9:16", "1:1"]);
    expect(MEDIA_STUDIO_VIDEO_CAPABILITIES.durationsSec).toEqual([5, 10, 15]);
  });

  it("steers readable text away from the video model when avoidInSceneText is true", () => {
    const prompt = buildSceneGenerationPrompt(
      "City skyline at dusk",
      { ...DEFAULT_GENERATION_SETTINGS, avoidInSceneText: true },
      createDefaultConsistencyProfile("Test")
    );
    expect(prompt.toLowerCase()).toContain("do not render readable text");
  });
});

describe("textOverlays", () => {
  it("preserves user text exactly after normalize", () => {
    expect(normalizeOverlayText("  GHANA IN 2050  ")).toBe("GHANA IN 2050");
    expect(validateOverlayTextExact("GHANA IN 2050", "GHANA IN 2050")).toBe(true);
  });

  it("creates title overlays from quoted prompt phrases", () => {
    const overlays = suggestedTitleOverlaysFromPrompt('Title "GHANA IN 2050" for the clip');
    expect(overlays[0].text).toBe("GHANA IN 2050");
    expect(overlays[0].kind).toBe("title");
  });

  it("does not mutate overlay text on create", () => {
    const layer = createTextOverlay({ kind: "title", text: "Exact Copy" });
    expect(layer.text).toBe("Exact Copy");
  });
});

describe("qualityCheck", () => {
  it("returns NEEDS REVIEW when no scenes have output", () => {
    const { scenes, suggestedTitle } = planScenesFromPrompt({ masterPrompt: "Test" });
    const report = runVideoProjectQualityCheck({
      id: "p1",
      title: suggestedTitle,
      status: "draft",
      createdAt: 1,
      updatedAt: 1,
      masterPrompt: "Test",
      settings: DEFAULT_GENERATION_SETTINGS,
      consistency: createDefaultConsistencyProfile("Test"),
      scenes,
      textOverlays: [],
    });
    expect(report.headline).toBe("NEEDS REVIEW");
    expect(report.disclaimer).toContain("heuristics");
  });
});

describe("idempotency", () => {
  it("blocks duplicate in-flight generation for the same scene", () => {
    const nonce = newGenerationNonce();
    expect(beginSceneGeneration("proj", "scene1", nonce)).toBe(true);
    expect(beginSceneGeneration("proj", "scene1", "other")).toBe(false);
    completeSceneGeneration("proj", "scene1", nonce);
    expect(beginSceneGeneration("proj", "scene1", newGenerationNonce())).toBe(true);
  });
});

describe("locationContext", () => {
  it("detects Ghana / Accra without inventing false facts in prompt helper", () => {
    const loc = parseLocationFromPrompt("Futuristic Accra in Ghana");
    expect(loc?.country).toBe("Ghana");
    expect(loc?.city).toBe("Accra");
  });
});

describe("credit estimate", () => {
  it("multiplies scene count by per-clip cost", () => {
    expect(estimateProjectCredits(3, 10, 20)).toBe(60);
  });
});
