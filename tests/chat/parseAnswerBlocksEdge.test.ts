import { describe, expect, it } from "vitest";
import { parseAnswerBlocks } from "../../web/lib/chat/parseAnswerBlocks";

describe("parseAnswerBlocks edge cases", () => {
  it("does not split plain prose mentioning conclusion", () => {
    const result = parseAnswerBlocks(
      "The conclusion of this analysis is that solar adoption is accelerating across Ghana."
    );
    expect(result.isStructured).toBe(false);
    expect(result.blocks).toHaveLength(0);
  });

  it("does not treat intro+conclusion only as structured without a main section", () => {
    const raw = `## Introduction
Opening context only.

## Conclusion
Final takeaway only.`;

    const result = parseAnswerBlocks(raw);
    expect(result.isStructured).toBe(false);
  });

  it("parses intro + main + conclusion headings", () => {
    const raw = `## Introduction
Intro body.

## Main message
Core analysis with enough detail.

## Conclusion
Final summary.`;

    const result = parseAnswerBlocks(raw);
    expect(result.isStructured).toBe(true);
    expect(result.blocks.map((b) => b.kind)).toEqual(["introduction", "main", "conclusion"]);
  });

  it("ignores HTML comment markers without markdown headings", () => {
    const raw = `<!-- giga3:intro -->
Intro via comment.

## Main message
Body content here.

## Conclusion
End.`;

    const result = parseAnswerBlocks(raw);
    expect(result.isStructured).toBe(true);
    expect(result.blocks.map((b) => b.kind)).toEqual(["main", "conclusion"]);
  });
});
