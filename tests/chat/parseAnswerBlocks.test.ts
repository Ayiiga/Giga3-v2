import { describe, expect, it } from "vitest";
import { parseAnswerBlocks } from "../../web/lib/chat/parseAnswerBlocks";

describe("parseAnswerBlocks", () => {
  it("returns non-structured for plain assistant replies", () => {
    const result = parseAnswerBlocks("Here is a short answer about Ghana.");
    expect(result.isStructured).toBe(false);
    expect(result.blocks).toHaveLength(0);
  });

  it("splits introduction, main message, and conclusion sections", () => {
    const raw = `# Climate policy overview

## Introduction
Ghana is leading West Africa on renewable targets.

## Main message
Solar capacity grew 40% since 2022. Grid stability remains the main bottleneck for rural adoption.

## Conclusion
Policy continuity and storage investment will determine whether 2030 targets are met.`;

    const result = parseAnswerBlocks(raw);
    expect(result.isStructured).toBe(true);
    expect(result.blocks.map((b) => b.kind)).toEqual(["introduction", "main", "conclusion"]);
    expect(result.blocks[0].content).toContain("renewable targets");
    expect(result.blocks[1].content).toContain("Solar capacity");
    expect(result.blocks[2].content).toContain("2030 targets");
  });

  it("keeps display title separate from answer blocks", () => {
    const raw = `**Energy outlook**

## Introduction
Opening context.

## Main message
Core analysis with enough detail to qualify as a substantive assistant reply for structured rendering in the product experience.

## Conclusion
Final takeaway.`;

    const result = parseAnswerBlocks(raw);
    expect(result.title).toBe("Energy outlook");
    expect(result.isStructured).toBe(true);
  });
});
