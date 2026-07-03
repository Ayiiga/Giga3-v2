import { describe, expect, it } from "vitest";
import {
  buildChatRoutePlan,
  chatSystemProfile,
  classifyRequestKind,
  enhanceImageGenerationPrompt,
  getFreeChatSystemLabel,
  imageAssetOrientation,
  resolveAiProviderTier,
  shouldEnableWebSearch,
  shouldStartFailoverAttempt,
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

  it("detects a broad range of visual-asset phrasings", () => {
    const prompts = [
      "make me a poster for a coffee shop grand opening",
      "I need a flyer for my shop",
      "design a logo for my bakery",
      "create an infographic about climate change",
      "draw a banner for my youtube channel",
      "generate a business card",
      "can you make a birthday invitation",
      "I want a book cover for my novel",
      "produce a thumbnail for this video",
    ];
    for (const p of prompts) {
      expect(classifyRequestKind(p, "general")).toBe("image_generation");
    }
  });

  it("routes diagrams/flowcharts to text (native Mermaid), not raster images", () => {
    for (const p of [
      "draw a flowchart of the user login process",
      "create a diagram of the water cycle",
      "make a mind map for my study plan",
      "generate a sequence diagram for checkout",
    ]) {
      expect(classifyRequestKind(p, "general")).toBe("text_chat");
    }
  });

  it("does not misclassify ordinary requests as image generation", () => {
    for (const p of [
      "make a plan for my week",
      "draw a conclusion from this data",
      "design a database schema",
      "create a function that sorts an array",
    ]) {
      expect(classifyRequestKind(p, "general")).toBe("text_chat");
    }
  });
});

describe("imageAssetOrientation", () => {
  it("uses portrait for posters/flyers/certificates", () => {
    expect(imageAssetOrientation("a poster for my event")).toBe("portrait");
    expect(imageAssetOrientation("design a flyer")).toBe("portrait");
  });
  it("uses landscape for banners/thumbnails", () => {
    expect(imageAssetOrientation("a banner for my channel")).toBe("landscape");
    expect(imageAssetOrientation("make a thumbnail")).toBe("landscape");
  });
  it("defaults to square for generic images", () => {
    expect(imageAssetOrientation("a photo of a cat")).toBe("square");
  });
});

describe("enhanceImageGenerationPrompt", () => {
  it("adds design guidance for text-bearing assets", () => {
    const out = enhanceImageGenerationPrompt("make a poster for a sale");
    expect(out).toContain("make a poster for a sale");
    expect(out.toLowerCase()).toContain("legibl");
  });
  it("leaves plain image prompts unchanged", () => {
    expect(enhanceImageGenerationPrompt("a photo of a cat")).toBe(
      "a photo of a cat"
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

describe("chatSystemProfile", () => {
  it("gives smart a lower temperature and longer answers", () => {
    expect(chatSystemProfile("smart")).toEqual({
      temperature: 0.35,
      maxTokensMultiplier: 1.5,
    });
  });

  it("gives creator a higher temperature for creative writing", () => {
    expect(chatSystemProfile("creator")).toEqual({
      temperature: 0.95,
      maxTokensMultiplier: 1.25,
    });
  });

  it("defaults unknown systems to fast profile", () => {
    expect(chatSystemProfile(undefined)).toEqual({
      temperature: 0.7,
      maxTokensMultiplier: 1,
    });
    expect(chatSystemProfile("unknown")).toEqual({
      temperature: 0.7,
      maxTokensMultiplier: 1,
    });
  });
});

describe("getFreeChatSystemLabel", () => {
  it("returns descriptive labels for each free chat system", () => {
    expect(getFreeChatSystemLabel("smart")).toBe("Giga3 Smart (Reasoning)");
    expect(getFreeChatSystemLabel("vision")).toBe("Giga3 Vision");
    expect(getFreeChatSystemLabel("creator")).toBe("Giga3 Creator");
    expect(getFreeChatSystemLabel("fast")).toBe("Giga3 Fast");
  });
});

describe("shouldStartFailoverAttempt", () => {
  it("always runs the primary attempt regardless of elapsed time", () => {
    expect(
      shouldStartFailoverAttempt({ elapsedMs: 999_999, budgetMs: 1000, isPrimary: true })
    ).toBe(true);
  });

  it("runs fallback attempts while under budget", () => {
    expect(
      shouldStartFailoverAttempt({ elapsedMs: 40_000, budgetMs: 100_000, isPrimary: false })
    ).toBe(true);
  });

  it("skips fallback attempts once the budget is spent", () => {
    expect(
      shouldStartFailoverAttempt({ elapsedMs: 100_000, budgetMs: 100_000, isPrimary: false })
    ).toBe(false);
    expect(
      shouldStartFailoverAttempt({ elapsedMs: 120_000, budgetMs: 100_000, isPrimary: false })
    ).toBe(false);
  });

  it("treats an infinite budget as unlimited", () => {
    expect(
      shouldStartFailoverAttempt({
        elapsedMs: 999_999,
        budgetMs: Number.POSITIVE_INFINITY,
        isPrimary: false,
      })
    ).toBe(true);
  });
});
