import { describe, expect, it } from "vitest";
import {
  detectDetailFollowUpIntent,
  prepareAnswerQualityContext,
} from "../../convex/answerQuality";

describe("Smart Answers prompt guidance", () => {
  it("asks educational replies to use optional adaptive section headings", () => {
    const context = prepareAnswerQualityContext({
      mode: "gigalearn",
      query: "Explain photosynthesis for a junior high student in Accra",
    });
    expect(context.systemPromptAddon).toContain("optional teaching aid");
    expect(context.systemPromptAddon).toContain("## ⚡ Quick Answer");
    expect(context.systemPromptAddon).toContain("## 📝 Practice / Try It");
    expect(context.systemPromptAddon).toMatch(/Never leave a heading empty/i);
    expect(context.systemPromptAddon).toContain("Natural response organization");
    expect(context.systemPromptAddon).not.toContain("## Main message");
    expect(context.systemPromptAddon).not.toContain("## Introduction");
  });

  it("does not force Smart Answers headings onto a greeting", () => {
    const context = prepareAnswerQualityContext({
      mode: "general",
      query: "hello",
    });
    expect(context.responseMode).toBe("conversational");
    expect(context.systemPromptAddon).not.toContain("## ⚡ Quick Answer");
  });

  it("asks detail follow-ups to deepen instead of repeating", () => {
    expect(detectDetailFollowUpIntent("give me more detail")).toBe(true);
    expect(detectDetailFollowUpIntent("don't repeat, explain further")).toBe(true);
    const context = prepareAnswerQualityContext({
      mode: "homework",
      query: "Tell me more detail about filtration",
      history: [
        { role: "user", content: "What are separation techniques?" },
        {
          role: "assistant",
          content: "## ⚡ Quick Answer\nSeparation techniques split mixtures.",
        },
      ],
    });
    expect(context.systemPromptAddon).toContain("Detail follow-up");
    expect(context.systemPromptAddon).toContain("Do not repeat");
    expect(context.systemPromptAddon).toContain("More Complete Explanation");
  });
});
