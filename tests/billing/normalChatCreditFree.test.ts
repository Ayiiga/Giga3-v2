import { describe, expect, it } from "vitest";
import { classifyRequestKind } from "../../convex/providerRouter";
import {
  CREDIT_COSTS,
  shouldDeductCreditsForChatRequestKind,
} from "../../convex/creditsConfig";

/**
 * Mandatory billing regressions: ordinary AI chat must not spend credits.
 */
describe("normal chat credit billing policy", () => {
  const ordinaryQueries = [
    "What is photosynthesis?",
    "Explain that again in simpler English",
    "Give me five exam questions about it",
    "Summarize the paragraph I pasted above",
    "Rewrite this email more politely",
    "Brainstorm names for my bakery",
    "Give me three examples of metaphors",
    "I want to make a video someday — what should I learn first?",
  ];

  it("classifies ordinary prompts as text_chat (not image generation)", () => {
    for (const query of ordinaryQueries) {
      expect(classifyRequestKind(query, "general")).toBe("text_chat");
      expect(shouldDeductCreditsForChatRequestKind("text_chat")).toBe(false);
    }
  });

  it("still prices explicit image generation", () => {
    expect(classifyRequestKind("Generate a logo for my bakery", "social")).toBe(
      "image_generation"
    );
    expect(shouldDeductCreditsForChatRequestKind("image_generation")).toBe(true);
    expect(CREDIT_COSTS.image).toBe(2);
    expect(CREDIT_COSTS.video).toBeGreaterThan(0);
  });

  it("follow-ups and detailed explanations stay text_chat", () => {
    expect(
      classifyRequestKind("Explain photosynthesis in detail step by step", "homework")
    ).toBe("text_chat");
    expect(classifyRequestKind("Give me a quick answer about gravity", "general")).toBe(
      "text_chat"
    );
  });
});
