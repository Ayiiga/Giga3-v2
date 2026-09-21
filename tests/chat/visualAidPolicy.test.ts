import { describe, expect, it } from "vitest";
import {
  prepareAnswerQualityContext,
  stripUnsolicitedVisualAids,
  userRequestedVisualAid,
  validateAnswerQuality,
} from "../../convex/answerQuality";
import { composeSystemPrompt } from "../../convex/assistantIdentity";

describe("visual aids stay off unless the user asks", () => {
  it("does not treat an explanation as a visual request", () => {
    expect(userRequestedVisualAid("Explain how photosynthesis works")).toBe(false);
    expect(userRequestedVisualAid("Please add a diagram of the water cycle")).toBe(true);
    expect(userRequestedVisualAid("I need a visual aid for this lesson")).toBe(true);
  });

  it("strips a diagram the model added to a plain explanation", () => {
    const query = "Explain how photosynthesis works for Giga3 AI students";
    const context = prepareAnswerQualityContext({ mode: "homework", query });
    const validated = validateAnswerQuality({
      answer: [
        "Photosynthesis converts light energy into chemical energy in plants.",
        "",
        "### Visual Aids",
        "```mermaid",
        "flowchart LR",
        "A-->B",
        "```",
      ].join("\n"),
      context,
    });

    expect(validated.content).toContain("Photosynthesis converts");
    expect(validated.content).not.toMatch(/```mermaid/);
    expect(validated.content).not.toMatch(/Visual Aids/);
    expect(validated.report.flags).not.toContain("visual_content_generated");
  });

  it("keeps a diagram when the user asked for a visual aid", () => {
    const query = "Draw a diagram of the water cycle";
    const context = prepareAnswerQualityContext({ mode: "homework", query });
    const validated = validateAnswerQuality({
      answer: "Water moves from sea to cloud and back to the ground.",
      context,
    });

    expect(validated.content).toMatch(/```mermaid/);
    expect(validated.report.flags).toContain("visual_content_generated");
  });

  it("does not blank an answer that is only a fenced diagram", () => {
    const cleaned = stripUnsolicitedVisualAids("```mermaid\nflowchart LR\nA-->B\n```");
    expect(cleaned).toBe("");
  });

  it("tells the model to separate introduction and conclusion and to skip unrequested visuals", () => {
    const prompt = composeSystemPrompt("Mode: test");
    expect(prompt).toContain("## Introduction");
    expect(prompt).toContain("## Main message");
    expect(prompt).toContain("## Conclusion");
    expect(prompt).toContain("Do not add visual aids unless the user explicitly asks");
    expect(prompt).not.toContain("Smart visual detection");
  });
});
