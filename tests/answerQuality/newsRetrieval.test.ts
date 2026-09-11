import { describe, expect, it } from "vitest";
import {
  prepareAnswerQualityContext,
  validateAnswerQuality,
} from "../../convex/answerQuality";

describe("news retrieval answer quality", () => {
  it("uses educational mode for Ghana news queries instead of high-stakes", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "general",
      query: "What's the latest Ghana news today?",
    });
    expect(ctx.responseMode).toBe("educational");
    expect(ctx.requiresCitation).toBe(false);
    expect(ctx.showVerificationByDefault).toBe(false);
  });

  it("uses educational mode in news chat mode", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "news",
      query: "Summarize today's headlines.",
    });
    expect(ctx.responseMode).toBe("educational");
    expect(ctx.requiresCitation).toBe(false);
  });

  it("keeps fact-check requests in high-stakes mode", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "general",
      query: "Fact-check this claim about the election results.",
    });
    expect(ctx.responseMode).toBe("high_stakes");
    expect(ctx.requiresCitation).toBe(true);
  });

  it("does not replace sourced Ghana news answers with the high-stakes fallback", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "news",
      query: "Breaking news in Accra",
    });
    const sampleAnswer = [
      "Here are the latest Ghana headlines:",
      "",
      "- **Developing** — Parliament session update (8 Sep 2026) — [Citi Newsroom](https://citinewsroom.com/example)",
      "- **Verified** — Black Stars squad announcement (7 Sep 2026) — [Graphic Online](https://graphic.com.gh/example)",
    ].join("\n");

    const validated = validateAnswerQuality({
      answer: sampleAnswer,
      context: ctx,
    });

    expect(validated.content).toContain("Citi Newsroom");
    expect(validated.content).not.toContain("can't confidently verify");
    expect(validated.report.flags).not.toContain("high_stakes_unverified");
    expect(validated.content).not.toContain("### Verification");
  });

  it("uses educational mode for Ghana economic news queries", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "general",
      query: "What are the latest figures on inflation in Ghana?",
    });
    expect(ctx.responseMode).toBe("educational");
  });

  it("still blocks unsupported high-stakes medical answers without citations", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "general",
      query: "What dosage of this drug should I take for my symptoms?",
    });
    const validated = validateAnswerQuality({
      answer:
        "Take 500mg twice daily for 14 days. Most patients improve within 3 days. Contact your doctor if symptoms persist.",
      context: ctx,
    });

    expect(validated.content).toContain("can't confidently verify");
    expect(validated.report.flags).toContain("high_stakes_unverified");
  });
});
