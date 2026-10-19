import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prepareAnswerQualityContext } from "../../convex/answerQuality";
import { composeSystemPrompt, GIGA3_IDENTITY_RULES } from "../../convex/assistantIdentity";
import {
  hasEmailDraftIntent,
  hasTranslationIntent,
  hasWritingCraftIntent,
  NATURAL_RESPONSE_STYLE_ADDON,
} from "../../convex/writingCraft";

/** Lightweight redundancy heuristic for TEST I (no live LLM). */
function openingClosingOverlapRatio(text: string): number {
  const paras = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paras.length < 2) return 0;
  const first = paras[0].toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const last = paras[paras.length - 1].toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const a = new Set(first.split(/\s+/).filter((t) => t.length > 3));
  const b = new Set(last.split(/\s+/).filter((t) => t.length > 3));
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const t of a) if (b.has(t)) overlap += 1;
  return overlap / Math.min(a.size, b.size);
}

describe("natural response style (A–J)", () => {
  it("A: simple factual question prefers plain prose, not forced Smart Answers headings", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "general",
      query: "What is photosynthesis?",
    });
    expect(ctx.systemPromptAddon).toContain("Natural response organization");
    expect(ctx.systemPromptAddon).toContain("NOT every response needs an introduction");
    expect(ctx.systemPromptAddon).toMatch(/plain prose without Smart Answers headings/i);
    expect(ctx.systemPromptAddon).not.toMatch(
      /Simple fact: ## ⚡ Quick Answer only/
    );
  });

  it("B: translation is writing craft — deliver translation without teaching template", () => {
    const q = "Translate 'Good morning' into Twi.";
    expect(hasTranslationIntent(q)).toBe(true);
    expect(hasWritingCraftIntent(q)).toBe(true);
    const ctx = prepareAnswerQualityContext({ mode: "general", query: q });
    expect(ctx.responseMode).toBe("conversational");
    expect(ctx.systemPromptAddon).toContain("Writing Quality Standard");
    expect(ctx.systemPromptAddon).toContain("For translations:");
    expect(ctx.systemPromptAddon).not.toContain("## ⚡ Quick Answer");
  });

  it("C: social caption is craft — finished copy, no Smart Answers", () => {
    const q = "Write a short Facebook caption about hard work.";
    expect(hasWritingCraftIntent(q)).toBe(true);
    const ctx = prepareAnswerQualityContext({ mode: "general", query: q });
    expect(ctx.responseMode).toBe("conversational");
    expect(ctx.systemPromptAddon).toContain("finished content");
    expect(ctx.systemPromptAddon).not.toContain("## ⚡ Quick Answer");
  });

  it("D: email draft is craft — message itself, no preamble instruction conflict", () => {
    const q = "Write an email requesting a meeting.";
    expect(hasEmailDraftIntent(q)).toBe(true);
    expect(hasWritingCraftIntent(q)).toBe(true);
    const ctx = prepareAnswerQualityContext({ mode: "general", query: q });
    expect(ctx.responseMode).toBe("conversational");
    expect(ctx.systemPromptAddon).toContain("For emails and short messages:");
    expect(ctx.systemPromptAddon).not.toContain("## ⚡ Quick Answer");
  });

  it("E: complex educational explanation keeps optional teaching sections", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "gigalearn",
      query: "Explain photosynthesis step by step and give examples.",
    });
    expect(ctx.responseMode).toBe("educational");
    expect(ctx.systemPromptAddon).toContain("## 🧠 More Complete Explanation");
    expect(ctx.systemPromptAddon).toContain("optional teaching aid");
    expect(ctx.systemPromptAddon).toContain("only the ones that help");
  });

  it("F: explicit essay request preserves introduction/conclusion instructions", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "university",
      query:
        "Write an essay about climate change with an introduction and conclusion.",
    });
    expect(ctx.systemPromptAddon).toContain("Natural response organization");
    expect(ctx.systemPromptAddon).toMatch(
      /explicitly asks for an introduction, conclusion, essay/i
    );
    expect(GIGA3_IDENTITY_RULES).toMatch(
      /explicitly requests an introduction, conclusion, essay/i
    );
  });

  it("G: uncertain identity — state uncertainty once, no stacked disclaimer template", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "general",
      query: "Who was Simon Taku?",
    });
    expect(ctx.systemPromptAddon).toContain("Uncertainty:");
    expect(ctx.systemPromptAddon).toContain(
      "Do not stack several paragraphs that only restate the same uncertainty"
    );
    expect(GIGA3_IDENTITY_RULES).toContain(
      "do not stack several paragraphs that only restate the same disclaimer"
    );
    // Style example: short clarifying reply is preferred over multi-paragraph padding
    // that restates the same uncertainty in opening and closing.
    const badStyle = [
      "There is no verified information confirming who Simon Taku was as a historical figure.",
      "Some stories blend religious or legendary themes around the name.",
      "Ultimately there is no verified information confirming who Simon Taku was as a historical figure, so consult academic resources.",
    ].join("\n\n");
    const goodStyle =
      "I can't verify Simon Taku's identity from the information available here. Do you mean a person from a particular country, a religious story, or a local legend? A little more context would help.";
    expect(openingClosingOverlapRatio(badStyle)).toBeGreaterThan(0.4);
    expect(goodStyle.split(/\n\s*\n/).length).toBe(1);
    expect(openingClosingOverlapRatio(goodStyle)).toBe(0);
  });

  it("H: comprehensive report keeps useful structure via document/research paths", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "general",
      query: "Prepare a comprehensive business report with recommendations.",
    });
    expect(hasWritingCraftIntent(ctx.query)).toBe(true);
    expect(ctx.systemPromptAddon).toContain("Writing Quality Standard");
    expect(ctx.systemPromptAddon).toMatch(/headings|report/i);
    expect(NATURAL_RESPONSE_STYLE_ADDON).toContain("Complex teaching, essays, reports");
  });

  it("I: natural style forbids opening/closing paraphrase padding", () => {
    expect(NATURAL_RESPONSE_STYLE_ADDON).toContain(
      "Do not repeat the same point in the opening, body, and closing"
    );
    expect(NATURAL_RESPONSE_STYLE_ADDON).toContain("In conclusion…");
    expect(composeSystemPrompt("Mode: test")).toContain(
      "NOT every response needs an introduction or a conclusion"
    );
  });

  it("J: regression — multimodal/vision policy and credit-free chat paths untouched in source", () => {
    const identity = composeSystemPrompt("Mode: test");
    expect(identity).toContain("Do not add visual aids unless the user explicitly asks");
    expect(identity).toContain("Mandatory multimodal sequence");

    const credits = readFileSync(
      resolve(__dirname, "../../convex/creditsConfig.ts"),
      "utf8"
    );
    expect(credits).toContain("shouldDeductCreditsForChatRequestKind");
    expect(credits).toContain('return requestKind === "image_generation"');

    const worker = readFileSync(
      resolve(__dirname, "../../convex/chatReplyWorker.ts"),
      "utf8"
    );
    expect(worker).toContain("Ordinary text chat is credit-free");
  });
});
