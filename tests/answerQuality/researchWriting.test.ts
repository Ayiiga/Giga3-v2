import { describe, expect, it } from "vitest";
import { prepareAnswerQualityContext } from "../../convex/answerQuality";

describe("research & writing response modes", () => {
  it("treats ordinary book writing as conversational in book mode", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "book",
      query: "Write a book about artificial intelligence in Africa.",
    });
    expect(ctx.responseMode).toBe("conversational");
    expect(ctx.showVerificationByDefault).toBe(false);
    expect(ctx.requiresCitation).toBe(false);
  });

  it("does not force high-stakes mode for research writing tasks", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "research",
      query: "Write a research report about Ghana's AI industry.",
    });
    expect(ctx.responseMode).toBe("educational");
    expect(ctx.showVerificationByDefault).toBe(false);
    expect(ctx.systemPromptAddon).toContain("GigaResearch");
  });

  it("keeps fictional creative writing conversational", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "general",
      query: "Write me a fictional story about Ghana in 2050.",
    });
    expect(ctx.responseMode).toBe("conversational");
  });

  it("uses high-stakes mode for medical topics", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "general",
      query: "What dosage of this drug should I take for my symptoms?",
    });
    expect(ctx.responseMode).toBe("high_stakes");
    expect(ctx.requiresCitation).toBe(true);
  });

  it("uses high-stakes mode for news fact-check requests", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "general",
      query: "Fact-check this claim about the election results.",
    });
    expect(ctx.responseMode).toBe("high_stakes");
  });
});
