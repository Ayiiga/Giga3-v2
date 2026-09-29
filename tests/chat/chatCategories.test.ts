import { describe, expect, it } from "vitest";
import {
  CHAT_CATEGORIES,
  getCategoryById,
  getCategoryForMode,
} from "../../web/lib/chat/chatCategories";

describe("chat categories", () => {
  it("lists the six simplified user-facing categories", () => {
    expect(CHAT_CATEGORIES.map((c) => c.label)).toEqual([
      "General",
      "Learn",
      "Research",
      "Writing",
      "Code",
      "Create",
    ]);
  });

  it("maps research and news modes to the Research category", () => {
    expect(getCategoryForMode("research").id).toBe("research");
    expect(getCategoryForMode("news").id).toBe("research");
  });

  it("falls back to General for unknown category ids", () => {
    expect(getCategoryById("general").id).toBe("general");
    // @ts-expect-error — defensive fallback for stale client ids
    expect(getCategoryById("business").id).toBe("general");
  });
});
