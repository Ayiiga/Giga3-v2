import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("AnswerBlockActions share contract", () => {
  it("shares only the block text via shareText, not conversation content", () => {
    const source = readFileSync(
      resolve(__dirname, "../../web/components/chat/AnswerBlockActions.tsx"),
      "utf8"
    );
    expect(source).toContain("shareText({");
    expect(source).toContain("text: trimmed");
    expect(source).not.toMatch(/conversation|messages|fullContent/i);
  });
});

describe("shareText fallback when Web Share unavailable", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", {
      share: undefined,
      clipboard: { writeText: vi.fn(async () => undefined) },
    });
    vi.stubGlobal("document", {
      createElement: vi.fn(() => ({
        value: "",
        setAttribute: vi.fn(),
        style: {},
        select: vi.fn(),
        remove: vi.fn(),
      })),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
      execCommand: vi.fn(() => true),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("copies block text to clipboard when navigator.share is missing", async () => {
    const { shareText } = await import("../../web/lib/share/clientShare");
    const blockOnly = "Nomination deadline: 19 October 2026.";
    const result = await shareText({
      title: "Giga3 AI — Main message",
      text: blockOnly,
    });
    expect(result.ok).toBe(true);
    expect(navigator.clipboard?.writeText).toHaveBeenCalled();
    const copied = vi.mocked(navigator.clipboard!.writeText).mock.calls[0]?.[0] as string;
    expect(copied).toContain("19 October 2026");
    expect(copied).not.toContain("Introduction");
  });
});
