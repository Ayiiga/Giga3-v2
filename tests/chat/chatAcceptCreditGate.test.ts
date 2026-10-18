import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CREDIT_COSTS,
  creditActionForChatImageGeneration,
  creditActionForMode,
  shouldDeductCreditsForChatRequestKind,
} from "../../convex/creditsConfig";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("normal chat is credit-free", () => {
  it("does not deduct credits for ordinary text_chat request kinds", () => {
    expect(shouldDeductCreditsForChatRequestKind("text_chat")).toBe(false);
    expect(shouldDeductCreditsForChatRequestKind("image_generation")).toBe(true);
  });

  it("keeps image generation on the image credit action", () => {
    expect(creditActionForChatImageGeneration()).toBe("image");
    expect(CREDIT_COSTS.image).toBeGreaterThan(0);
  });

  it("acceptMessage gates credits only for image_generation, not every mode", () => {
    const src = read("convex/chatMessaging.ts");
    expect(src).toContain("classifyRequestKind");
    expect(src).toContain('requestKind === "image_generation"');
    expect(src).toContain("creditActionForChatImageGeneration");
    expect(src).not.toContain("creditActionForMode(mode)");
    expect(src).toContain("requireAndConsumeAdvancedPersonaAccess");
  });

  it("worker never deducts for text_chat replies", () => {
    const src = read("convex/chatReplyWorker.ts");
    expect(src).toContain(
      'chargedAi && engineResult.requestKind === "image_generation"'
    );
    expect(src).toContain("Ordinary text chat is credit-free");
    // Only one deductForChatModeInternal call remains (free-pipeline image failover).
    expect(src.match(/deductForChatModeInternal/g)?.length ?? 0).toBe(1);
  });

  it("regenerate path does not deduct for ordinary text replies", () => {
    const src = read("convex/platformActions.ts");
    expect(src).toContain("Ordinary text chat is credit-free");
    expect(src).toContain('engineResult.providerId === "openai_image"');
    expect(src).not.toContain("deductForChatModeInternal");
  });

  it("composer must not block send on chat credit balance", () => {
    const src = read("web/components/chat/ChatInput.tsx");
    expect(src).toContain("Ordinary text chat is credit-free");
    expect(src).not.toContain("outOfCredits");
    expect(src).not.toContain("CHAT_CREDIT_COST");
  });
});

describe("mode cost mapping still exists for non-chat surfaces", () => {
  it("maps modes to positive credit costs for legacy/premium helpers", () => {
    expect(CREDIT_COSTS[creditActionForMode("general")]).toBeGreaterThan(0);
    expect(CREDIT_COSTS[creditActionForMode("homework")]).toBeGreaterThan(0);
    expect(CREDIT_COSTS[creditActionForMode("research")]).toBeGreaterThan(0);
  });
});

describe("job dedupe retention", () => {
  it("deleteJob retains terminal jobs for clientRequestId dedupe", () => {
    const src = read("convex/chatReplyJobs.ts");
    expect(src).toContain("CHAT_JOB_DONE_RETAIN");
    expect(src).not.toMatch(
      /export const deleteJob = internalMutation\(\{[\s\S]*?await ctx\.db\.delete\(args\.jobId\)/
    );
  });
});
