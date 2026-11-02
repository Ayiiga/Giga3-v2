import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("conversational child-safety response parity", () => {
  it("returns the same safety-filtered content that is persisted", () => {
    const source = readFileSync("convex/chatConversationalCore.ts", "utf8");

    expect(source).toContain("content: safeContent,");
    expect(source).toMatch(
      /appendAssistantReplyIfMissing[\s\S]*?content:\s*safeContent[\s\S]*?return\s*\{[\s\S]*?content:\s*safeContent/
    );
    expect(source).not.toMatch(/return\s*\{[\s\S]*?content:\s*validated\.content/);
  });
});
