import { describe, expect, it } from "vitest";
import {
  buildVideoScriptGenerationPrompt,
  buildVideoScriptRewritePrompt,
  buildVideoPromptFromPreProduction,
} from "../../convex/mediaVideoScriptPrompts";
import {
  countWords,
  estimateSpeechDurationSec,
  splitScriptIntoScenes,
} from "../../web/lib/media/videoPreProduction/scriptUtils";
import { buildPreProductionVideoPrompt } from "../../web/lib/media/videoPreProduction/buildVideoPrompt";

describe("media video pre-production prompts", () => {
  it("builds script generation prompt from idea", () => {
    const prompt = buildVideoScriptGenerationPrompt("A school promo in Accra");
    expect(prompt).toContain("SCENES:");
    expect(prompt).toContain("A school promo in Accra");
  });

  it("builds rewrite prompt preserving original context", () => {
    const prompt = buildVideoScriptRewritePrompt({
      originalScript: "Scene 1 — Hello world",
      idea: "School promo",
    });
    expect(prompt).toContain("Scene 1 — Hello world");
    expect(prompt).toContain("School promo");
  });

  it("builds video prompt from approved script", () => {
    const prompt = buildVideoPromptFromPreProduction({
      approvedScript: "TITLE: Test\nHOOK: Hi",
      voiceLabel: "Warm female",
    });
    expect(prompt).toContain("Narration (Warm female)");
    expect(prompt).toContain("TITLE: Test");
  });
});

describe("video pre-production script utils", () => {
  it("estimates duration from word count", () => {
    expect(countWords("one two three four")).toBe(4);
    expect(estimateSpeechDurationSec("word ".repeat(50))).toBeGreaterThanOrEqual(20);
  });

  it("splits numbered scenes from script", () => {
    const scenes = splitScriptIntoScenes(
      "Scene 1 — [Wide shot] Welcome to our studio.\nScene 2 — [Close-up] Meet the team."
    );
    expect(scenes.length).toBe(2);
    expect(scenes[0].visualPrompt.toLowerCase()).toContain("wide");
  });

  it("builds client video prompt with scenes", () => {
    const prompt = buildPreProductionVideoPrompt({
      approvedScript: "Narration line here.",
      scenes: [
        {
          id: "s1",
          sceneNumber: 1,
          narration: "Narration line here.",
          visualPrompt: "City skyline",
        },
      ],
      voiceover: { voiceUri: "", voiceName: "Default", lang: "en", rate: 1, pitch: 1 },
    });
    expect(prompt).toContain("City skyline");
    expect(prompt).toContain("Narration line here.");
  });
});
