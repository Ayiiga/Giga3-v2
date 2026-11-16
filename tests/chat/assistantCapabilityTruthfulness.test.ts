import { describe, expect, it } from "vitest";
import {
  composeSystemPrompt,
  GIGA3_IDENTITY_RULES,
  GIGA3_MODE_ROLE_PROMPTS,
} from "../../convex/assistantIdentity";
import { AI_MODES, getSystemPrompt } from "../../convex/aiModes";

describe("Giga3 Chat capability honesty and education regression", () => {
  it("shares capability constraints across every chat mode", () => {
    for (const mode of AI_MODES) {
      const prompt = getSystemPrompt(mode);
      expect(prompt).toContain("When users ask for strengths, weaknesses, features, or comparisons");
      expect(prompt).toContain("Do not claim personal learning from conversations");
      expect(prompt).toContain("Never invent a citation");
      expect(prompt).toContain("Live search, attachments, document exports");
      expect(prompt).not.toContain("read responses with African voices");
      expect(prompt).not.toContain("stable multi-provider failover");
    }
  });

  it("does not advertise retired standalone media routes", () => {
    const prompt = composeSystemPrompt("Mode: test");
    expect(prompt).toContain("Standalone Media Studio, Video AI, GigaEdit/GigaEdits and AI Studio destinations are retired");
    expect(prompt).toContain("GIGA3_PRODUCT_ROUTING_RULES");
    expect(prompt).not.toContain("[Media Studio](/media?tab=image)");
    expect(prompt).not.toContain("[GigaEdit](/gigaedit/)");
  });

  it("makes evidence and tool execution a prerequisite for success claims", () => {
    expect(GIGA3_IDENTITY_RULES).toContain("unless an appropriate tool actually returned a result");
    expect(GIGA3_IDENTITY_RULES).toContain("Never invent deployments, rankings, subscribers");
    expect(GIGA3_IDENTITY_RULES).toContain("Do not promise guaranteed search rankings");
  });

  it("distinguishes original practice from official WAEC questions", () => {
    expect(GIGA3_MODE_ROLE_PROMPTS.waec).toContain(
      "Label newly generated items as original exam-style practice"
    );
    expect(GIGA3_MODE_ROLE_PROMPTS.gigalearn).toContain(
      "Keep BECE, WASSCE and Teacher Promotion subjects separate"
    );
    expect(GIGA3_MODE_ROLE_PROMPTS.gigalearn).toContain(
      "clear immediate correct/incorrect feedback"
    );
    expect(GIGA3_MODE_ROLE_PROMPTS.gigalearn).toContain(
      "unless the assessment system confirms it"
    );
  });

  it("retains prior formatting and attachment guardrails", () => {
    const prompt = composeSystemPrompt("Mode: test");
    expect(prompt).toContain("Mandatory multimodal sequence");
    expect(prompt).toContain("NOT every response needs an introduction or a conclusion");
    expect(prompt).toContain("Do not add visual aids unless the user explicitly asks");
  });
});
