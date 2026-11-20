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

  it("never substitutes an automatic diagram for a poster redesign", () => {
    const query = "Please redesign the poster";
    expect(userRequestedVisualAid(query)).toBe(false);
    const validated = validateAnswerQuality({
      answer: "Which poster would you like to redesign?",
      context: prepareAnswerQualityContext({ mode: "general", query }),
    });
    expect(validated.content).not.toContain("Visual Aids");
    expect(validated.content).not.toContain("giga-visual");
  });

  it("never presents a missing-person placeholder as a delivered visual", () => {
    const query = "Generate a visual poster for the missing person";
    const validated = validateAnswerQuality({
      answer: [
        "Here is your proposed visual poster with placeholders.",
        "```giga-visual",
        '{"type":"poster","title":"MISSING PERSON","elements":[{"content":"[Please provide Age]"',
      ].join("\n"),
      context: prepareAnswerQualityContext({ mode: "general", query }),
    });
    expect(validated.content).toContain("I couldn’t render the poster here");
    expect(validated.content).not.toMatch(/mermaid|giga-visual|provide Age/);
    expect(validated.report.flags).not.toContain("visual_content_generated");
  });

  it("does not present an apology and placeholder design copy as a completed missing-person poster", () => {
    const response = [
      "My sincerest apologies for the repeated delay! Here is the missing person poster.",
      "I will now describe an attractive design instead of rendering the visual image.",
      "Attractive Design and Color Choices for the Missing Person Poster:",
      "1. Color Palette: light blue and gold",
      "[ INSERT LARGE, CLEAR PHOTO OF ANTWII CHRISTIAN HERE ]",
      "Copy and paste this into a design tool.",
    ].join("\n");
    const context = prepareAnswerQualityContext({
      mode: "general",
      query: "Please generate the actual visual poster for the missing person",
    });
    const validated = validateAnswerQuality({ answer: response, context });
    expect(validated.content).toContain("I couldn’t render the poster here");
    expect(validated.content).not.toMatch(/color palette|insert large|copy and paste/i);
  });

  it("keeps explicitly requested poster copy as text", () => {
    const context = prepareAnswerQualityContext({
      mode: "general",
      query: "Write the text for a missing person poster",
    });
    const response = "Missing Person Poster\nName: Example Person\nContact: Example";
    const validated = validateAnswerQuality({ answer: response, context });
    expect(validated.content).toContain("Name: Example Person");
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

  it("tells the model to use optional Smart Answers and to skip unrequested visuals", () => {
    const prompt = composeSystemPrompt("Mode: test");
    expect(prompt).toContain("## ⚡ Quick Answer");
    expect(prompt).toContain("## 📘 Simple Definition");
    expect(prompt).toContain("## 📝 Practice / Try It");
    expect(prompt).toContain("## 🚀 Next Step");
    expect(prompt).toContain("NOT every response needs an introduction or a conclusion");
    expect(prompt).toContain("plain prose without Smart Answers headings");
    expect(prompt).toContain("Never emit an empty section");
    expect(prompt).not.toContain("## Introduction");
    expect(prompt).not.toContain("## Main message");
    expect(prompt).toContain("Do not add visual aids unless the user explicitly asks");
    expect(prompt).not.toContain("Smart visual detection");
  });
});
