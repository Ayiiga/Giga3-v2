import { describe, expect, it } from "vitest";
import { chunkSpeechText } from "../../web/lib/speech/chunkSpeechText";

describe("chunkSpeechText", () => {
  it("keeps a short English line in one piece", () => {
    expect(chunkSpeechText("Hello from Giga3.")).toEqual(["Hello from Giga3."]);
  });

  it("splits long text on sentence boundaries", () => {
    const text = Array.from(
      { length: 6 },
      (_, index) => `Sentence ${index + 1} explains the idea in plain English.`
    ).join(" ");
    const chunks = chunkSpeechText(text);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join(" ")).toContain("Sentence 1");
    expect(chunks.join(" ")).toContain("Sentence 6");
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(180);
      expect(chunk.trim()).toBe(chunk);
    }
  });
});