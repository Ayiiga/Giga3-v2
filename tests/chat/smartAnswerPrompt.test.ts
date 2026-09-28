import { describe, expect, it } from "vitest";
import { prepareAnswerQualityContext } from "../../convex/answerQuality";

describe("Smart Answers prompt guidance", () => {
  it("asks educational replies to use adaptive section headings", () => {
    const context = prepareAnswerQualityContext({
      mode: "gigalearn",
      query: "Explain photosynthesis for a junior high student in Accra",
    });
    expect(context.systemPromptAddon).toContain("## ⚡ Quick Answer");
    expect(context.systemPromptAddon).toContain("## 📝 Practice / Try It");
    expect(context.systemPromptAddon).toContain("never leave a heading empty");
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
});
