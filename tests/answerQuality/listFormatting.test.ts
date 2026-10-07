import { describe, expect, it } from "vitest";
import {
  prepareAnswerQualityContext,
  validateAnswerQuality,
} from "../../convex/answerQuality";
import { normalizeStructuredCatalogAnswer } from "../../convex/newsEvidence/userPresentation";

const CRAMPED_SCHOLARSHIP_ANSWER = `Here are some of the best fully funded AI/Computer Science scholarships currently available for Ghanaian students: 1. **Google PhD Fellowship Program** - **Funding:** Covers tuition and provides a monthly stipend for living expenses. - **Eligibility:** Must be a PhD student at an eligible university in Africa or have a strong research proposal. - **Deadline:** Varies by region; check the official site for updates. - **Study Mode:** Full-time, on-campus. - **Application Link:** [Google PhD Fellowship](https://scholar.africa/guides/computer-science-scholarships-african-students) 2. **AIMS (African Institute for Mathematical Sciences)** - **Funding:** Full scholarship covering tuition, accommodation, living stipend, and travel. - **Eligibility:** Open to students from Africa with a strong background in mathematics or related fields. - **Deadline:** Check the AIMS website for specific dates. - **Study Mode:** Full-time, on-campus. - **Application Link:** [AIMS Scholarships](https://scholar.africa/guides/computer-science-scholarships-african-students) These scholarships provide comprehensive funding. For the most accurate and up-to-date information, please visit the provided application links.

Made with Giga3 AI — https://www.giga3ai.com.`;

describe("structured catalog list formatting", () => {
  it("expands cramped numbered scholarship lists into spaced markdown", () => {
    const normalized = normalizeStructuredCatalogAnswer(CRAMPED_SCHOLARSHIP_ANSWER);

    expect(normalized).toContain("\n\n1. **Google PhD Fellowship Program**");
    expect(normalized).toContain("\n\n2. **AIMS");
    expect(normalized).toContain("\n   - **Funding:**");
    expect(normalized).toContain("\n   - **Eligibility:**");
    expect(normalized).not.toMatch(/Made with Giga3 AI/i);
  });

  it("preserves newlines when removing source tags during validation", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "general",
      query: "List fully funded AI scholarships for Ghanaian students",
    });

    const validated = validateAnswerQuality({
      answer: "Intro paragraph.\n\n1. **Program A**\n   - **Funding:** Full\n\n2. **Program B**\n   - **Funding:** Partial [S1]",
      context: ctx,
    });

    expect(validated.content).toContain("\n\n1. **Program A**");
    expect(validated.content).toContain("\n\n2. **Program B**");
    expect(validated.content).not.toContain("[S1]");
  });

  it("adds catalog formatting guidance for scholarship queries", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "general",
      query: "What are the best fully funded AI scholarships for Ghanaian students?",
    });

    expect(ctx.systemPromptAddon).toContain("Structured catalog format");
    expect(ctx.systemPromptAddon).toContain("numbered list");
  });
});
