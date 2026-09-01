import { describe, expect, it } from "vitest";
import { speechErrorMessage } from "../../web/lib/chat/voiceDictationErrors";

describe("speechErrorMessage", () => {
  it("maps permission errors to actionable copy", () => {
    expect(speechErrorMessage("not-allowed")).toContain("Microphone access was blocked");
    expect(speechErrorMessage("no-speech")).toContain("No speech detected");
  });

  it("falls back for unknown errors", () => {
    expect(speechErrorMessage("unknown-code")).toContain("Voice input failed");
  });
});
