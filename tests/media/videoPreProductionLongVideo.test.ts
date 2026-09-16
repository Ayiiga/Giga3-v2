import { describe, expect, it } from "vitest";
import { mediaVideoCreditCost } from "../../web/lib/media/videoCredits";
import {
  buildPreProductionScenePrompt,
  estimateLongVideoCredits,
  formatTargetDurationLabel,
  planLongVideoScenes,
  sceneCountForTargetDuration,
  speechFitsTarget,
  TARGET_VIDEO_DURATION_OPTIONS,
} from "../../web/lib/media/videoPreProduction/longVideo";

describe("long video pre-production planning", () => {
  it("exposes target duration options up to 3 minutes", () => {
    expect(TARGET_VIDEO_DURATION_OPTIONS).toContain(180);
    expect(TARGET_VIDEO_DURATION_OPTIONS[0]).toBe(15);
  });

  it("computes scene count from target duration", () => {
    expect(sceneCountForTargetDuration(15)).toBe(1);
    expect(sceneCountForTargetDuration(30)).toBe(2);
    expect(sceneCountForTargetDuration(60)).toBe(4);
    expect(sceneCountForTargetDuration(180)).toBe(12);
  });

  it("formats duration labels for the UI", () => {
    expect(formatTargetDurationLabel(15)).toBe("15s");
    expect(formatTargetDurationLabel(60)).toBe("1 min");
    expect(formatTargetDurationLabel(180)).toBe("3 min");
  });

  it("splits script into the requested number of scenes", () => {
    const script = [
      "Scene 1 — [Wide shot] Welcome to our brand.",
      "Scene 2 — [Close-up] Meet our team.",
      "Scene 3 — [Product] See what we build.",
      "Scene 4 — [Call to action] Join us today.",
    ].join("\n");
    const scenes = planLongVideoScenes(script, 60);
    expect(scenes).toHaveLength(4);
    expect(scenes[0].sceneNumber).toBe(1);
    expect(scenes[3].narration.toLowerCase()).toContain("join");
  });

  it("pads short scripts to fill a 3-minute target", () => {
    const script = "One short promo line about our studio.";
    const scenes = planLongVideoScenes(script, 180);
    expect(scenes).toHaveLength(12);
    expect(scenes.every((scene) => scene.durationSec === 15)).toBe(true);
  });

  it("estimates credits as scene count times per-clip cost", () => {
    const perClip = mediaVideoCreditCost(15);
    expect(estimateLongVideoCredits(180, perClip)).toBe(12 * perClip);
    expect(estimateLongVideoCredits(15, perClip)).toBe(perClip);
  });

  it("builds scene prompts with continuity context", () => {
    const prompt = buildPreProductionScenePrompt({
      scene: {
        id: "s1",
        sceneNumber: 1,
        narration: "Hello from Accra.",
        visualPrompt: "City skyline at golden hour",
      },
      sceneIndex: 0,
      totalScenes: 4,
      approvedScript: "Full script",
      characterContext: "Same presenter throughout.",
      voiceover: { voiceUri: "", voiceName: "Warm", lang: "en", rate: 1, pitch: 1 },
    });
    expect(prompt).toContain("Scene 1 of 4");
    expect(prompt).toContain("Same presenter throughout.");
    expect(prompt).toContain("City skyline");
  });

  it("checks whether narration fits the target capacity", () => {
    const short = "A quick hello.";
    const long = "word ".repeat(400);
    expect(speechFitsTarget(short, 30)).toBe(true);
    expect(speechFitsTarget(long, 30)).toBe(false);
  });
});
