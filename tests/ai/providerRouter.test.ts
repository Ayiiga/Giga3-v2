import { describe, expect, it } from "vitest";
import {
  buildChatRoutePlan,
  classifyRequestKind,
  resolveAiProviderTier,
  shouldEnableWebSearch,
} from "../../convex/providerRouter";

describe("resolveAiProviderTier", () => {
  it("routes free users to free tier", () => {
    expect(
      resolveAiProviderTier({
        subscriptionPlan: "free",
        subscriptionExpiresAt: null,
        hasPurchasedCredits: false,
      })
    ).toBe("free");
  });

  it("routes active subscribers to premium tier", () => {
    expect(
      resolveAiProviderTier({
        subscriptionPlan: "pro",
        subscriptionExpiresAt: Date.now() + 60_000,
        hasPurchasedCredits: false,
      })
    ).toBe("premium");
  });

  it("routes credit purchasers on free plan to premium tier", () => {
    expect(
      resolveAiProviderTier({
        subscriptionPlan: "free",
        subscriptionExpiresAt: null,
        hasPurchasedCredits: true,
      })
    ).toBe("premium");
  });
});

describe("classifyRequestKind", () => {
  it("detects image generation prompts", () => {
    expect(
      classifyRequestKind("Generate a logo for my bakery", "social")
    ).toBe("image_generation");
  });

  it("keeps normal chat as text", () => {
    expect(classifyRequestKind("Explain photosynthesis", "homework")).toBe(
      "text_chat"
    );
  });
});

describe("buildChatRoutePlan", () => {
  it("uses Gemini first for free text chat", () => {
    const plan = buildChatRoutePlan({
      tier: "free",
      mode: "general",
      query: "Hello",
    });
    expect(plan.primaryProvider).toBe("gemini");
    expect(plan.failoverOrder).not.toContain("openai_primary");
    expect(plan.requestKind).toBe("text_chat");
  });

  it("routes free Smart system to fal.ai first", () => {
    const plan = buildChatRoutePlan({
      tier: "free",
      mode: "research",
      query: "Explain quantum computing",
      chatSystem: "smart",
    });
    expect(plan.primaryProvider).toBe("fal_ai");
    expect(plan.failoverOrder).not.toContain("openai_primary");
  });

  it("uses OpenAI first for premium text chat", () => {
    const plan = buildChatRoutePlan({
      tier: "premium",
      mode: "research",
      query: "Analyze market trends",
    });
    expect(plan.primaryProvider).toBe("openai_primary");
  });

  it("routes free image prompts away from OpenAI", () => {
    const plan = buildChatRoutePlan({
      tier: "free",
      mode: "social",
      query: "Create a flyer for my event",
    });
    expect(plan.requestKind).toBe("image_generation");
    expect(plan.primaryProvider).not.toBe("openai_image");
  });

  it("routes premium image prompts to OpenAI", () => {
    const plan = buildChatRoutePlan({
      tier: "premium",
      mode: "social",
      query: "Create a flyer for my event",
    });
    expect(plan.requestKind).toBe("image_generation");
    expect(plan.primaryProvider).toBe("openai_image");
  });
});

describe("shouldEnableWebSearch", () => {
  it("enables search for news mode", () => {
    expect(shouldEnableWebSearch("What happened today?", "news")).toBe(true);
  });

  it("enables search for current-events phrasing", () => {
    expect(shouldEnableWebSearch("Latest AI news", "general")).toBe(true);
  });
});
