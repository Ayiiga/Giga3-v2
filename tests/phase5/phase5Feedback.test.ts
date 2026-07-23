import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Phase 5 feedback workflow", () => {
  it("adds expanded types and priority without breaking existing validators", () => {
    const schema = readFileSync(
      resolve(__dirname, "../../convex/schema.ts"),
      "utf8"
    );
    expect(schema).toContain('v.literal("bug")');
    expect(schema).toContain('v.literal("usability")');
    expect(schema).toContain('v.literal("content_report")');
    expect(schema).toContain("feedbackPriorityValidator");
    expect(schema).toContain("priority: v.optional(feedbackPriorityValidator)");
  });

  it("gates phase5-only submission types and exposes admin dashboard", () => {
    const src = readFileSync(
      resolve(__dirname, "../../convex/platformFeedback.ts"),
      "utf8"
    );
    expect(src).toContain("listFeedbackDashboardAdmin");
    expect(src).toContain('isPhase5FlagEnabled(ctx, "phase5.feedback")');
    expect(src).toContain("inferPriority");
  });

  it("only shows expanded feedback types when phase5.feedback is on", () => {
    const modal = readFileSync(
      resolve(__dirname, "../../web/components/feedback/FeedbackModal.tsx"),
      "utf8"
    );
    expect(modal).toContain("phase5.feedback");
    expect(modal).toContain("content_report");
    expect(modal).toContain("usePhase5Flags");
  });
});
