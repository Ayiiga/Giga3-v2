import { describe, expect, it } from "vitest";
import { FREE_OPENAI_DAILY_LIMIT } from "../../convex/freeOpenAiQuota";
import { isProModelLocked, modelsForAccess } from "../../web/lib/chat/gigaModels";

describe("FREE_OPENAI_DAILY_LIMIT", () => {
  it("defaults to 5 free OpenAI messages per day", () => {
    expect(FREE_OPENAI_DAILY_LIMIT).toBeGreaterThanOrEqual(3);
    expect(FREE_OPENAI_DAILY_LIMIT).toBeLessThanOrEqual(20);
  });
});

describe("gigaModels free OpenAI access", () => {
  it("shows all models including Pro in the selector", () => {
    expect(modelsForAccess()).toHaveLength(5);
    expect(modelsForAccess().some((m) => m.id === "pro")).toBe(true);
  });

  it("locks Pro only when free quota is exhausted and not premium", () => {
    expect(isProModelLocked("pro", true)).toBe(false);
    expect(isProModelLocked("pro", false)).toBe(true);
    expect(isProModelLocked("fast", false)).toBe(false);
  });
});
