import { describe, expect, it } from "vitest";
import {
  buildSegmentContinuityRecap,
  continuedConversationTitle,
  countCompletedExchanges,
  getSegmentExchangeLimit,
  shouldSegmentConversation,
} from "../../convex/chatSegmentation";

describe("chatSegmentation", () => {
  it("defaults to 20 exchanges within the 15–30 range", () => {
    expect(getSegmentExchangeLimit()).toBe(20);
  });

  it("counts completed user-assistant pairs only", () => {
    const messages = [
      { role: "user", content: "a" },
      { role: "assistant", content: "b" },
      { role: "user", content: "c" },
    ];
    expect(countCompletedExchanges(messages)).toBe(1);
  });

  it("segments when the exchange limit is reached", () => {
    const messages = Array.from({ length: 40 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `m${i}`,
    }));
    expect(shouldSegmentConversation(messages, 20)).toBe(true);
    expect(shouldSegmentConversation(messages, 21)).toBe(false);
  });

  it("builds a continuity recap from recent turns", () => {
    const recap = buildSegmentContinuityRecap([
      { role: "user", content: "Hello", createdAt: 1 },
      { role: "assistant", content: "Hi there", createdAt: 2 },
    ]);
    expect(recap).toContain("Context carried over");
    expect(recap).toContain("User: Hello");
    expect(recap).toContain("Assistant: Hi there");
  });

  it("labels continued conversations without duplicating the suffix", () => {
    expect(continuedConversationTitle("Research plan")).toBe(
      "Research plan (continued)"
    );
    expect(continuedConversationTitle("Research plan (continued)")).toBe(
      "Research plan (continued)"
    );
  });
});
