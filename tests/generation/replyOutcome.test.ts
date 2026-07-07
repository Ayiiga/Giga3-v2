import { describe, expect, it } from "vitest";
import {
  assessReplyFromMessages,
  hasUsableAssistantContent,
} from "../../web/lib/generation/replyOutcome";
import { fingerprintLastAssistant } from "../../web/lib/chat/replyDetection";

describe("hasUsableAssistantContent", () => {
  it("accepts non-empty assistant text", () => {
    expect(hasUsableAssistantContent("Hello world")).toBe(true);
  });

  it("rejects empty and failure stubs", () => {
    expect(hasUsableAssistantContent("   ")).toBe(false);
    expect(
      hasUsableAssistantContent(
        "AI could not complete this reply. Your message was saved — please try again."
      )
    ).toBe(false);
  });
});

describe("assessReplyFromMessages", () => {
  it("detects success when a new assistant row arrives after wait start", () => {
    const before = fingerprintLastAssistant([
      { _id: "a1", role: "assistant", content: "Hi", createdAt: 1000 },
    ]);
    const rows = [
      { _id: "a1", role: "assistant", content: "Hi", createdAt: 1000 },
      { _id: "a2", role: "assistant", content: "Done", createdAt: 5000 },
    ];
    expect(assessReplyFromMessages(rows, before, 4000, 1)).toBe("success");
  });

  it("detects streaming updates on the same assistant id", () => {
    const before = fingerprintLastAssistant([
      { _id: "a1", role: "assistant", content: "", createdAt: 4000 },
    ]);
    const rows = [
      { _id: "a1", role: "assistant", content: "Streaming chunk", createdAt: 4000 },
    ];
    expect(assessReplyFromMessages(rows, before, 3000, 1)).toBe("success");
  });

  it("stays waiting when no new assistant content landed", () => {
    const before = fingerprintLastAssistant([
      { _id: "a1", role: "assistant", content: "Hi", createdAt: 1000 },
    ]);
    const rows = [
      { _id: "a1", role: "assistant", content: "Hi", createdAt: 1000 },
    ];
    expect(assessReplyFromMessages(rows, before, 5000, 1)).toBe("waiting");
  });
});
