import { describe, expect, it } from "vitest";
import {
  applyMtnLowConfidencePrefix,
  buildMtnDeadlineGuidance,
  buildMtnHeroesSystemPromptAddon,
  detectMtnDeadlineQuestion,
  detectMtnExplicitVisualRequest,
  detectMtnHeroesOfChangeIntent,
  detectMtnNominationLetterIntent,
  GIGA3_NOMINATION_CONTEXT,
  MTN_OFFICIAL_FACTS,
  MTN_USER_PROVIDED_SMS_CLOSE_DATE,
  normalizeMtnConfidenceScore,
  shouldApplyMtnVerificationPrefix,
  stripMtnDisallowedVisualContent,
} from "../convex/mtnHeroesOfChangeRules";
import {
  prepareAnswerQualityContext,
  validateAnswerQuality,
} from "../convex/answerQuality";

describe("mtnHeroesOfChangeRules — trigger boundaries", () => {
  const positiveCases: Array<[string, string]> = [
    ["MTN Heroes of Change", "Tell me about MTN Heroes of Change Season 8"],
    ["heroes.mtn.com.gh", "How do I nominate on heroes.mtn.com.gh?"],
    ["Giga3 MTN nomination", "Explain Giga3 AI for MTN Heroes of Change Digital Innovation nomination"],
    ["Ayiiga MTN", "Write a nomination letter for Ayiiga Benard Issaka MTN Heroes of Change"],
    ["Young Anointed MTN", "Young Anointed MTN Heroes nomination for Digital Innovation"],
    ["Giga3 Heroes", "Giga3 AI Heroes of Change Season 8"],
  ];

  const negativeCases: Array<[string, string]> = [
    ["Generic Giga3", "What is Giga3 AI?"],
    ["Giga3 usage", "How do I use Giga3 AI?"],
    ["Giga3 homework", "Explain photosynthesis for Giga3 AI students"],
    ["Generic Ayiiga bio", "Write a normal biography of Ayiiga Benard Issaka"],
    ["Young Anointed alone", "Tell me about Young Anointed"],
    ["Generic MTN", "What is MTN?"],
    ["MTN Ghana general", "Tell me about MTN Ghana"],
    ["MTN mobile money", "MTN mobile money rates"],
    ["Photosynthesis", "Explain photosynthesis"],
    ["Compare AI", "Compare two AI platforms"],
  ];

  it.each(positiveCases)("%s triggers MTN mode", (_label, query) => {
    expect(detectMtnHeroesOfChangeIntent(query)).toBe(true);
  });

  it.each(negativeCases)("%s does not trigger MTN mode", (_label, query) => {
    expect(detectMtnHeroesOfChangeIntent(query)).toBe(false);
  });

  it("detects nomination letter intent only in MTN context", () => {
    expect(
      detectMtnNominationLetterIntent(
        "Write a nomination letter for Giga3 AI in MTN Heroes of Change"
      )
    ).toBe(true);
    expect(detectMtnNominationLetterIntent("Write a nomination letter for Giga3 AI")).toBe(
      false
    );
  });

  it("detects deadline questions in MTN context", () => {
    expect(
      detectMtnDeadlineQuestion("When does MTN Heroes of Change Season 8 close?")
    ).toBe(true);
    expect(detectMtnDeadlineQuestion("What is the deadline for homework?")).toBe(false);
  });
});

describe("mtnHeroesOfChangeRules — fact separation", () => {
  it("separates official MTN facts from nomination context in prompt", () => {
    const addon = buildMtnHeroesSystemPromptAddon("MTN Heroes of Change Season 8");
    expect(addon).toMatch(/Official MTN programme facts/i);
    expect(addon).toMatch(/User\/project nomination context/i);
    expect(addon).toMatch(/NOT MTN-confirmed/i);
    expect(addon).toMatch(new RegExp(MTN_OFFICIAL_FACTS.prizes.overallWinner));
    expect(addon).toMatch(/per remaining finalist/i);
    expect(addon).not.toMatch(/additional tier/i);
    expect(addon).toMatch(new RegExp(GIGA3_NOMINATION_CONTEXT.nominee.replace(/[()]/g, "\\$&")));
    expect(addon).toMatch(/Do not fabricate statistics/);
  });

  it("does not present 0549767070 as verified Season 8 official WhatsApp", () => {
    const addon = buildMtnHeroesSystemPromptAddon("MTN Heroes of Change Season 8");
    expect(addon).not.toMatch(/0549767070/);
    expect(addon).toMatch(/\+233244300000/);
    expect(addon).toMatch(/customercare\.gh@mtn\.com/);
  });

  it("includes cautious deadline guidance with conflicting dates", () => {
    const guidance = buildMtnDeadlineGuidance();
    expect(guidance).toMatch(/August–September 2026/);
    expect(guidance).toMatch(new RegExp(MTN_USER_PROVIDED_SMS_CLOSE_DATE));
    expect(guidance).toMatch(/differing dates/i);
    expect(guidance).toMatch(/Do NOT declare nominations open or closed/);
  });

  it("warns against unsupported MTN endorsement in nomination letter mode", () => {
    const addon = buildMtnHeroesSystemPromptAddon(
      "Draft a nomination letter for Giga3 AI MTN Heroes of Change"
    );
    expect(addon).toMatch(/do not invent achievements/i);
    expect(addon).toMatch(/two-page nomination\/support letter/i);
  });
});

describe("mtnHeroesOfChangeRules — confidence prefix", () => {
  it("prefixes at 0.79 when uncertainty is present", () => {
    expect(
      shouldApplyMtnVerificationPrefix({
        confidenceScore: 0.79,
        answerHasUncertainty: true,
      })
    ).toBe(true);
    expect(
      applyMtnLowConfidencePrefix("Uncertain detail.", {
        confidenceScore: 0.79,
        answerHasUncertainty: true,
      })
    ).toMatch(/^Verification needed/i);
  });

  it("does not prefix at 0.80 even with uncertainty", () => {
    expect(
      shouldApplyMtnVerificationPrefix({
        confidenceScore: 0.8,
        answerHasUncertainty: true,
      })
    ).toBe(false);
    expect(
      applyMtnLowConfidencePrefix("Detail.", {
        confidenceScore: 0.8,
        answerHasUncertainty: true,
      })
    ).toBe("Detail.");
  });

  it("does not prefix at 0.81", () => {
    expect(shouldApplyMtnVerificationPrefix({ confidenceScore: 0.81 })).toBe(false);
  });

  it("does not spuriously prefix a normal score of 0.7 without risk signals", () => {
    expect(shouldApplyMtnVerificationPrefix({ confidenceScore: 0.7 })).toBe(false);
  });

  it("prefixes on explicit risk flags regardless of medium score", () => {
    expect(
      shouldApplyMtnVerificationPrefix({
        confidenceScore: 0.7,
        flags: ["unsupported_claims"],
      })
    ).toBe(true);
  });

  it("handles malformed confidence safely", () => {
    for (const bad of [null, undefined, NaN, "0.79"]) {
      expect(normalizeMtnConfidenceScore(bad)).toBe(null);
      expect(
        shouldApplyMtnVerificationPrefix({ confidenceScore: bad, answerHasUncertainty: true })
      ).toBe(false);
      expect(shouldApplyMtnVerificationPrefix({ confidenceScore: bad })).toBe(false);
    }
    expect(normalizeMtnConfidenceScore(-1)).toBe(-1);
    expect(shouldApplyMtnVerificationPrefix({ confidenceScore: -1 })).toBe(true);
    expect(normalizeMtnConfidenceScore(1.5)).toBe(1.5);
    expect(shouldApplyMtnVerificationPrefix({ confidenceScore: 1.5 })).toBe(false);
  });
});

describe("mtnHeroesOfChangeRules — post-processing safety", () => {
  it("preserves PDF/PNG/A4 prose", () => {
    const cases = [
      "Please submit the nomination form as a PDF to heroes.mtn.com.gh",
      "Export the poster as PNG for social media.",
      "Print the nomination on A4 paper.",
      "Attach a JPG or JPEG scan of the form.",
      "Save the document as SVG if needed.",
      "See [heroes.mtn.com.gh](https://heroes.mtn.com.gh) for details.",
    ];
    for (const text of cases) {
      expect(stripMtnDisallowedVisualContent(text)).toBe(text);
    }
  });

  it("strips fenced visual blocks and verification sections only", () => {
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
    expect(cleaned).toBe("Nominee summary text.");
    expect(cleaned).not.toMatch(/```mermaid/);
    expect(cleaned).not.toMatch(/giga-visual/);
    expect(cleaned).not.toMatch(/### Verification/);
  });
});

describe("validateAnswerQuality — MTN integration", () => {
  it("does not spuriously prefix a normal MTN factual response", () => {
    const query = "Tell me about MTN Heroes of Change Season 8";
    const context = prepareAnswerQualityContext({ mode: "chat", query });
    expect(context.mtnHeroesOfChangeMode).toBe(true);

    const validated = validateAnswerQuality({
      answer:
        "Season 8 celebrates community heroes. The overall winner receives GH¢400,000.",
      context,
    });

    expect(validated.report.confidenceScore).toBe(0.7);
    expect(validated.content).not.toMatch(/^Verification needed/i);
  });

  it("prefixes when explicit uncertainty is present below 0.8", () => {
    const query = "Tell me about MTN Heroes of Change Season 8";
    const context = prepareAnswerQualityContext({ mode: "chat", query });
    const validated = validateAnswerQuality({
      answer:
        "I am not fully sure, but nominations may still be open. Please verify officially.",
      context,
    });
    expect(validated.content).toMatch(/^Verification needed/i);
  });

  it("suppresses auto visuals and verification UI in MTN mode", () => {
    const query = "Explain Giga3 AI for MTN Heroes of Change Digital Innovation nomination";
    const context = prepareAnswerQualityContext({ mode: "research", query });
    expect(context.showVerificationByDefault).toBe(false);

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
    expect(validated.report.verificationVisible).toBe(false);
    expect(validated.report.flags).toContain("mtn_heroes_text_only");
  });

  it("keeps normal answer-quality behavior for generic Giga3 homework", () => {
    const query = "Explain how photosynthesis works for Giga3 AI students";
    const context = prepareAnswerQualityContext({ mode: "homework", query });
    expect(context.mtnHeroesOfChangeMode).toBe(false);

    const validated = validateAnswerQuality({
      answer: "Photosynthesis converts light energy into chemical energy in plants.",
      context,
    });

    expect(validated.report.flags).not.toContain("mtn_heroes_text_only");
    expect(validated.content).not.toMatch(/^Verification needed/i);
  });
});

describe("mtnHeroesOfChangeRules — cross-request isolation", () => {
  it("does not leak MTN mode across sequential unrelated queries", () => {
    const sequence = [
      { q: "Tell me about MTN Heroes of Change Season 8.", mtn: true },
      { q: "Now explain photosynthesis.", mtn: false },
      { q: "Write Python code for sorting a list.", mtn: false },
      { q: "What is compound interest?", mtn: false },
      { q: "Tell me about MTN Heroes of Change Season 8.", mtn: true },
    ];

    for (const step of sequence) {
      const ctx = prepareAnswerQualityContext({ mode: "chat", query: step.q });
      expect(ctx.mtnHeroesOfChangeMode).toBe(step.mtn);
      expect(ctx.systemPromptAddon.includes("MTN Heroes of Change Season 8")).toBe(step.mtn);
    }
  });
});
