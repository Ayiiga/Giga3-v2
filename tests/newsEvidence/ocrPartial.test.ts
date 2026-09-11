import { describe, expect, it } from "vitest";
import {
  prepareAnswerQualityContext,
  validateAnswerQuality,
} from "../../convex/answerQuality";

describe("OCR partial read handling", () => {
  it("keeps partial OCR extraction instead of full rejection", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "general",
      query: "Read the text in this image",
      attachments: [
        {
          kind: "image",
          name: "poster.png",
          sizeBytes: 120_000,
          dataUrl: "data:image/png;base64,abc",
        },
      ],
    });

    const validated = validateAnswerQuality({
      answer: [
        "Here is what I can read:",
        "",
        "**Top heading:** readable — GIGA3 AI WORKSHOP",
        "**Middle paragraph:** partially readable — date and venue are unclear.",
        "**Bottom contact line:** unclear due to blur.",
      ].join("\n"),
      context: ctx,
    });

    expect(validated.content).toContain("GIGA3 AI WORKSHOP");
    expect(validated.report.flags).not.toContain("ocr_not_verified");
  });
});
