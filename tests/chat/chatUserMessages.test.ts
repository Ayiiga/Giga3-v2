import { describe, expect, it } from "vitest";
import {
  chatUserFacingMessage,
  isChatAssistantFailureStub,
  recoveryErrorCodeForJob,
} from "../../convex/chatUserMessages";
import { CHAT_ERROR_CODES } from "../../convex/chatErrorCodes";

describe("isChatAssistantFailureStub", () => {
  it("detects legacy and new failure stubs", () => {
    expect(
      isChatAssistantFailureStub(
        "I'm Giga3 AI — I couldn't finish this reply because our AI service didn't respond in time."
      )
    ).toBe(true);
    expect(
      isChatAssistantFailureStub(
        "Giga3 AI is temporarily unable to generate a response. Your message has been saved safely."
      )
    ).toBe(true);
    expect(isChatAssistantFailureStub("Hello! How can I help you today?")).toBe(false);
  });
});

describe("chatUserFacingMessage", () => {
  it("returns contextual copy per error code", () => {
    expect(chatUserFacingMessage(CHAT_ERROR_CODES.RESEARCH_TIMEOUT)).toContain(
      "Live research"
    );
    expect(chatUserFacingMessage(CHAT_ERROR_CODES.ALL_PROVIDERS_FAILED)).toContain(
      "temporarily unable"
    );
    expect(chatUserFacingMessage(CHAT_ERROR_CODES.RECOVERY_TIMEOUT)).toContain(
      "taking longer than expected"
    );
    expect(
      chatUserFacingMessage(CHAT_ERROR_CODES.UNKNOWN, { cancelled: true })
    ).toBe("Generation was cancelled.");
  });
});

describe("recoveryErrorCodeForJob", () => {
  it("uses research code for live web jobs", () => {
    expect(recoveryErrorCodeForJob({ liveWeb: true, kind: "reply" })).toBe(
      CHAT_ERROR_CODES.RESEARCH_TIMEOUT
    );
    expect(recoveryErrorCodeForJob({ kind: "conversational", content: "Hi" })).toBe(
      CHAT_ERROR_CODES.ALL_PROVIDERS_FAILED
    );
  });
});
