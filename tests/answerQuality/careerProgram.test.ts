import { describe, expect, it } from "vitest";
import {
  prepareAnswerQualityContext,
  validateAnswerQuality,
} from "../../convex/answerQuality";

const MPHIL_QUERY =
  "/Humanize I want to do mphil applied statistics data science and mphil applied statistics medical statistics. Which one is all weather, and marketable. Tell why it is all weather and marketable and the opportunities in it";

describe("career and academic program queries", () => {
  it("does not treat medical statistics program choice as high-stakes medical advice", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "general",
      query: MPHIL_QUERY,
    });

    expect(ctx.responseMode).toBe("educational");
    expect(ctx.showVerificationByDefault).toBe(false);
    expect(ctx.requiresCitation).toBe(false);
    expect(ctx.systemPromptAddon).toContain(
      "Never show Verification, Confidence scores"
    );
  });

  it("does not append internal Verification blocks to career guidance replies", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "general",
      query: MPHIL_QUERY,
    });

    const validated = validateAnswerQuality({
      answer:
        "Data science statistics MPhil tends to be more all-weather because demand spans finance, tech, and public sector analytics.",
      context: ctx,
    });

    expect(validated.content).not.toMatch(/### Verification/i);
    expect(validated.content).not.toMatch(/Confidence:/i);
    expect(validated.content).not.toMatch(/Evidence used:/i);
    expect(validated.content).not.toMatch(/Validation flags:/i);
    expect(validated.report.verificationVisible).toBe(false);
  });

  it("still uses high-stakes mode for genuine medical advice requests", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "general",
      query: "What dosage should I take for my chest pain symptoms?",
    });

    expect(ctx.responseMode).toBe("high_stakes");
  });
});
