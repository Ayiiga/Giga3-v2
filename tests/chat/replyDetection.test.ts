import { describe, expect, it } from "vitest";
import {
  fingerprintLastAssistant,
  isNewAssistantReply,
} from "../../web/lib/chat/replyDetection";

describe("replyDetection", () => {
  it("detects a new assistant after send", () => {
    const before = fingerprintLastAssistant([
      { _id: "a1", role: "assistant", content: "Hi", createdAt: 100 },
    ]);
    const after = fingerprintLastAssistant([
      { _id: "a1", role: "assistant", content: "Hi", createdAt: 100 },
      { _id: "a2", role: "assistant", content: "Hello", createdAt: 5000 },
    ]);
    expect(isNewAssistantReply(before, after, 4000)).toBe(true);
  });

  it("detects regenerate when assistant id changes but count stays the same", () => {
    const before = fingerprintLastAssistant([
      { _id: "u1", role: "user", content: "Q", createdAt: 1000 },
      { _id: "a1", role: "assistant", content: "Old", createdAt: 2000 },
    ]);
    const after = fingerprintLastAssistant([
      { _id: "u1", role: "user", content: "Q", createdAt: 1000 },
      { _id: "a2", role: "assistant", content: "New", createdAt: 3000 },
    ]);
    expect(isNewAssistantReply(before, after, 2500)).toBe(true);
  });

  it("does not treat stale assistant as a new reply", () => {
    const before = fingerprintLastAssistant([
      { _id: "a1", role: "assistant", content: "Hi", createdAt: 1000 },
    ]);
    const after = fingerprintLastAssistant([
      { _id: "a1", role: "assistant", content: "Hi", createdAt: 1000 },
    ]);
    expect(isNewAssistantReply(before, after, 5000)).toBe(false);
  });
});
