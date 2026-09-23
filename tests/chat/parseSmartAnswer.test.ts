import { describe, expect, it } from "vitest";
import { parseAnswerBlocks } from "../../web/lib/chat/parseAnswerBlocks";
import {
  parseSmartAnswer,
  smartAnswerSpokenText,
} from "../../web/lib/chat/parseSmartAnswer";

const EDUCATIONAL = `# Photosynthesis

## ⚡ Quick Answer
**Photosynthesis** turns light into food for a plant.

## 📘 Simple Definition
It is the process plants use to make **glucose** from light, water, and carbon dioxide.

## 🧠 More Complete Explanation
Chloroplasts capture light. The plant stores energy in sugar and releases oxygen.

## 🔑 Key Points
- **Chlorophyll** absorbs light.
- Water and carbon dioxide are the inputs.
- Oxygen is released.

## 🌍 Real-World Example
A school garden in Accra grows faster in the open yard than in a shaded corridor.

## 📝 Practice / Try It
Name the gas a mango leaf releases on a sunny afternoon.

## 🚀 Next Step
Ask how farmers in Ghana use shade nets without stopping photosynthesis.
`;

describe("parseSmartAnswer", () => {
  it("leaves a simple factual reply unstructured", () => {
    const raw = "The capital of Ghana is Accra.";
    const result = parseSmartAnswer(raw);
    expect(result.isSmart).toBe(false);
    expect(result.sections).toHaveLength(0);
    expect(result.plainContent).toBe(raw);
    expect(parseAnswerBlocks(raw).isStructured).toBe(false);
  });

  it("parses a full educational Smart Answer and keeps markdown in each section", () => {
    const result = parseSmartAnswer(EDUCATIONAL);
    expect(result.isSmart).toBe(true);
    expect(result.title).toBe("Photosynthesis");
    expect(result.sections.map((section) => section.id)).toEqual([
      "quick",
      "definition",
      "explanation",
      "points",
      "example",
      "practice",
      "next",
    ]);
    expect(result.sections[0].content).toContain("**Photosynthesis**");
    expect(result.sections[3].content).toContain("- **Chlorophyll**");
    expect(result.sections[4].content).toContain("Accra");
    expect(result.sections[5].label).toBe("Practice / Try It");
  });

  it("accepts a definition with only Quick Answer and Simple Definition", () => {
    const result = parseSmartAnswer(
      ["## Quick Answer", "A noun names a person, place, or thing.", "", "## Simple Definition", "In grammar, a noun is a naming word."].join(
        "\n"
      )
    );
    expect(result.isSmart).toBe(true);
    expect(result.sections.map((section) => section.label)).toEqual([
      "Quick Answer",
      "Simple Definition",
    ]);
  });

  it("drops empty sections and still renders the sections that have text", () => {
    const result = parseSmartAnswer(
      [
        "## ⚡ Quick Answer",
        "",
        "## 📘 Simple Definition",
        "A verb is a doing word.",
        "",
        "## 🚀 Next Step",
        "   ",
      ].join("\n")
    );
    expect(result.isSmart).toBe(true);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].id).toBe("definition");
  });

  it("keeps malformed or partial headings inside the current section", () => {
    const result = parseSmartAnswer(
      [
        "## ⚡ Quick Answer",
        "Accra is the capital of Ghana.",
        "",
        "## 📘",
        "still unfinished",
        "",
        "## Conclusion",
        "That is the fact.",
      ].join("\n")
    );
    expect(result.isSmart).toBe(true);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].content).toContain("## 📘");
    expect(result.sections[0].content).toContain("## Conclusion");
  });

  it("does not split headings that appear inside a code fence", () => {
    const result = parseSmartAnswer(
      [
        "## ⚡ Quick Answer",
        "Use this template:",
        "",
        "```md",
        "## 🔑 Key Points",
        "- not a real section",
        "```",
        "",
        "Then write your own bullets.",
      ].join("\n")
    );
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].content).toContain("## 🔑 Key Points");
    expect(result.sections[0].content).toContain("Then write your own bullets.");
  });

  it("leaves existing introduction / main / conclusion messages on the older parser", () => {
    const raw = `# Renewable targets

## Introduction
Ghana is leading West Africa on renewable targets.

## Main message
Solar capacity grew quickly, and rural feeders still need storage.

## Conclusion
Fund storage alongside new solar plants.`;
    const smart = parseSmartAnswer(raw);
    expect(smart.isSmart).toBe(false);
    const legacy = parseAnswerBlocks(raw);
    expect(legacy.isStructured).toBe(true);
    expect(legacy.blocks.map((block) => block.kind)).toEqual([
      "introduction",
      "main",
      "conclusion",
    ]);
  });

  it("parses a long reply without dropping the last section", () => {
    const bullets = Array.from({ length: 40 }, (_, index) => `- Point ${index + 1} about **light**`).join(
      "\n"
    );
    const raw = ["## ⚡ Quick Answer", "Plants make food from light.", "", "## 🔑 Key Points", bullets, "", "## 🚀 Next Step", "Compare a shaded and a sunny leaf."].join(
      "\n"
    );
    const result = parseSmartAnswer(raw);
    expect(result.sections).toHaveLength(3);
    expect(result.sections[1].content).toContain("Point 40");
    expect(result.sections[2].id).toBe("next");
  });

  it("moves a trailing verification block out of the last section", () => {
    const result = parseSmartAnswer(
      [
        "## ⚡ Quick Answer",
        "Drink safe water.",
        "",
        "### Verification",
        "- Confidence: low (0.20)",
      ].join("\n")
    );
    expect(result.sections[0].content).not.toContain("Verification");
    expect(result.appendix).toContain("### Verification");
  });

  it("builds spoken text with section labels and without markdown marks", () => {
    const spoken = smartAnswerSpokenText(parseSmartAnswer(EDUCATIONAL));
    expect(spoken).toContain("Photosynthesis");
    expect(spoken).toContain("Quick Answer.");
    expect(spoken).toContain("Key Points.");
    expect(spoken).not.toContain("**");
    expect(spoken).not.toContain("##");
  });
});
