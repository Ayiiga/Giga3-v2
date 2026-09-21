import { describe, expect, it } from "vitest";
import { parseAnswerBlocks } from "../../web/lib/chat/parseAnswerBlocks";

describe("parseAnswerBlocks", () => {
  it("separates a long prose answer into introduction, main message, and conclusion", () => {
    const raw = `Ghana's renewable energy target is the clearest and most useful place to start this explanation for a secondary school student.

Solar capacity has grown quickly since 2022, but rural feeders still drop voltage in the evening. Storage and steady policy are the two constraints that decide whether new plants actually reach classrooms and clinics.

The practical takeaway is to fund storage alongside new solar so the 2030 target is more than a headline.`;

    const result = parseAnswerBlocks(raw);
    expect(result.isStructured).toBe(true);
    expect(result.blocks.map((b) => b.kind)).toEqual(["introduction", "main", "conclusion"]);
    expect(result.blocks[0].content).not.toContain("Solar capacity");
    expect(result.blocks[1].content).toContain("Solar capacity");
    expect(result.blocks[1].content).not.toContain("practical takeaway");
    expect(result.blocks[2].content).toContain("practical takeaway");
  });

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
