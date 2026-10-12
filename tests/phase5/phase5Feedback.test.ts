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
    expect(src).toContain("ensureAdminAccess");
  });

  it("exposes full GigaEdits survey body to admins via bodyFull without a new mutation", () => {
    const src = readFileSync(
      resolve(__dirname, "../../convex/platformFeedback.ts"),
      "utf8"
    );
    expect(src).toContain("GIGAEDITS_CREATOR_SURVEY_TITLE");
    expect(src).toContain('GigaEdits Starter Pack survey');
    expect(src).toContain("bodyFull");
    expect(src).toContain("body: preview");
    // Still no public anonymous survey API.
    expect(src).not.toContain("gigaeditSurveyResponses");
    expect(src).toMatch(/export const listFeedbackDashboardAdmin = query/);

    const panel = readFileSync(
      resolve(__dirname, "../../web/components/admin/AdminPhase5FeedbackPanel.tsx"),
      "utf8"
    );
    expect(panel).toContain("bodyFull");
    expect(panel).toContain("Show full GigaEdits survey answers");
    expect(panel).toContain("whitespace-pre-wrap");
    // React text nodes escape user content — no dangerouslySetInnerHTML.
    expect(panel).not.toContain("dangerouslySetInnerHTML");
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
