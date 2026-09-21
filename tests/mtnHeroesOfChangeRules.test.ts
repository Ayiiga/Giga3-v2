import { describe, expect, it } from "vitest";
import {
  applyMtnLowConfidencePrefix,
  buildMtnHeroesSystemPromptAddon,
  detectMtnExplicitVisualRequest,
  detectMtnHeroesOfChangeIntent,
  detectMtnNominationLetterIntent,
  stripMtnDisallowedVisualContent,
} from "../convex/mtnHeroesOfChangeRules";
import {
  prepareAnswerQualityContext,
  validateAnswerQuality,
} from "../convex/answerQuality";

describe("mtnHeroesOfChangeRules detection", () => {
  it("detects MTN Heroes of Change queries", () => {
    expect(detectMtnHeroesOfChangeIntent("Tell me about MTN Heroes of Change Season 8")).toBe(
      true
    );
    expect(detectMtnHeroesOfChangeIntent("How do I nominate on heroes.mtn.com.gh?")).toBe(true);
  });

  it("detects Ayiiga Benard Issaka and Giga3 AI queries", () => {
    expect(detectMtnHeroesOfChangeIntent("Who is Ayiiga Benard Issaka?")).toBe(true);
    expect(detectMtnHeroesOfChangeIntent("What is Giga3 AI?")).toBe(true);
    expect(detectMtnHeroesOfChangeIntent("Young Anointed digital innovation")).toBe(true);
  });

  it("does not detect unrelated queries", () => {
    expect(detectMtnHeroesOfChangeIntent("Explain photosynthesis")).toBe(false);
    expect(detectMtnHeroesOfChangeIntent("MTN mobile money rates")).toBe(false);
  });

  it("detects nomination letter intent", () => {
    expect(
      detectMtnNominationLetterIntent(
        "Write a nomination letter for Ayiiga Benard Issaka and Giga3 AI"
      )
    ).toBe(true);
  });

  it("detects explicit visual requests", () => {
    expect(detectMtnExplicitVisualRequest("Create a poster image for the nomination")).toBe(true);
    expect(detectMtnExplicitVisualRequest("Summarize the nomination deadline")).toBe(false);
  });
});

describe("mtnHeroesOfChangeRules prompt and stripping", () => {
  it("includes factual Season 8 data and text-only rules", () => {
    const addon = buildMtnHeroesSystemPromptAddon("MTN Heroes of Change Season 8");
    expect(addon).toMatch(/Ayiiga Benard Issaka \(Young Anointed\)/);
    expect(addon).toMatch(/Digital Innovation/);
    expect(addon).toMatch(/heroes\.mtn\.com\.gh/);
    expect(addon).toMatch(/0549767070/);
    expect(addon).toMatch(/TEXT ONLY/);
    expect(addon).toMatch(/GH¢400,000/);
  });

  it("includes two-page letter guidance for nomination letters", () => {
    const addon = buildMtnHeroesSystemPromptAddon(
      "Draft a nomination letter for Giga3 AI in MTN Heroes of Change"
    );
    expect(addon).toMatch(/two-page nomination\/support letter/i);
  });

  it("strips visual blocks and verification sections", () => {
    const raw = [
      "Nominee summary text.",
      "",
      "### Visual Aids",
      "```mermaid",
      "flowchart TD",
      "A-->B",
      "```",
      "",
      "```giga-visual",
      '{"title":"Poster"}',
      "```",
      "",
      "### Verification",
      "- Confidence: high",
    ].join("\n");

    const cleaned = stripMtnDisallowedVisualContent(raw);
    expect(cleaned).toContain("Nominee summary text.");
    expect(cleaned).not.toMatch(/```mermaid/);
    expect(cleaned).not.toMatch(/giga-visual/);
    expect(cleaned).not.toMatch(/### Verification/);
    expect(cleaned).not.toMatch(/### Visual Aids/);
  });

  it("prefixes low-confidence answers with Verification needed", () => {
    const prefixed = applyMtnLowConfidencePrefix("Some uncertain detail.", 0.5);
    expect(prefixed).toMatch(/^Verification needed/i);
    expect(prefixed).toContain("heroes.mtn.com.gh");
  });
});

describe("validateAnswerQuality — MTN Heroes text-only mode", () => {
  it("suppresses auto visuals and verification for MTN Heroes queries", () => {
    const query = "Explain Giga3 AI for MTN Heroes of Change Digital Innovation nomination";
    const context = prepareAnswerQualityContext({ mode: "research", query });
    expect(context.mtnHeroesOfChangeMode).toBe(true);
    expect(context.showVerificationByDefault).toBe(false);
    expect(context.systemPromptAddon).toMatch(/TEXT ONLY/);

    const validated = validateAnswerQuality({
      answer: [
        "Giga3 AI is a Ghanaian platform.",
        "",
        "### Visual Aids",
        "```mermaid",
        "flowchart TD",
        "A-->B",
        "```",
      ].join("\n"),
      context,
    });

    expect(validated.content).not.toMatch(/```mermaid/);
    expect(validated.content).not.toMatch(/### Verification/);
    expect(validated.report.verificationVisible).toBe(false);
    expect(validated.report.flags).toContain("mtn_heroes_text_only");
  });

  it("does not attach auto visuals even in educational mode", () => {
    const query = "Explain how photosynthesis works for Giga3 AI students";
    const context = prepareAnswerQualityContext({ mode: "homework", query });
    expect(context.mtnHeroesOfChangeMode).toBe(true);

    const validated = validateAnswerQuality({
      answer: "Photosynthesis converts light energy into chemical energy in plants.",
      context,
    });

    expect(validated.content).not.toMatch(/### Visual Aids/);
    expect(validated.content).not.toMatch(/```mermaid/);
    expect(validated.report.flags).not.toContain("visual_content_generated");
  });
});
