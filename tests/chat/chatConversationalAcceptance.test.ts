import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { shouldAcceptConversationalEngineResult } from "../../convex/chatConversationalAcceptance";

describe("shouldAcceptConversationalEngineResult", () => {
  it("accepts a successful secondary-provider failover (usedFallback true)", () => {
    expect(
      shouldAcceptConversationalEngineResult({
        providerId: "openai_primary",
        content: "Here is a helpful answer about photosynthesis.",
        usedFallback: true,
      })
    ).toBe(true);
  });

  it("accepts a primary-provider success", () => {
    expect(
      shouldAcceptConversationalEngineResult({
        providerId: "gemini",
        content: "Hello — how can I help?",
        usedFallback: false,
      })
    ).toBe(true);
  });

  it("rejects local_fallback and empty or stub content", () => {
    expect(
      shouldAcceptConversationalEngineResult({
        providerId: "local_fallback",
        content:
          "Giga3 AI is temporarily unable to generate a response. Your message has been saved safely.",
        usedFallback: true,
      })
    ).toBe(false);
    expect(
      shouldAcceptConversationalEngineResult({
        providerId: "gemini",
        content: "   ",
        usedFallback: false,
      })
    ).toBe(false);
    expect(
      shouldAcceptConversationalEngineResult({
        providerId: "gemini",
        content:
          "Giga3 AI is temporarily unable to generate a response. Your message has been saved safely.",
        usedFallback: false,
      })
    ).toBe(false);
  });
});

describe("conversational core wiring", () => {
  it("uses shouldAcceptConversationalEngineResult instead of rejecting usedFallback", () => {
    const core = readFileSync(
      resolve(__dirname, "../../convex/chatConversationalCore.ts"),
      "utf8"
    );
    expect(core).toContain("shouldAcceptConversationalEngineResult");
    expect(core).not.toMatch(
      /if\s*\(\s*engineResult\.usedFallback\s*\|\|\s*engineResult\.providerId\s*===\s*"local_fallback"\s*\)/
    );
    expect(core).toContain("chatSystem");
  });

  it("passes job.chatSystem into executeConversationalReply", () => {
    const reply = readFileSync(
      resolve(__dirname, "../../convex/chatConversationalReply.ts"),
      "utf8"
    );
    expect(reply).toContain("chatSystem: job.chatSystem");
  });
});
