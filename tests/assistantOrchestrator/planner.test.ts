import { describe, expect, it } from "vitest";
import {
  buildExecutionPlan,
  formatPlanSummary,
  planNeedsUserConfirmation,
} from "../../convex/assistantOrchestrator/planner";
import { isAllowedConnectorOperation } from "../../convex/connectors/toolPolicy";

describe("executive assistant planner", () => {
  it("maps Zoom + email invite into confirmable steps", () => {
    const plan = buildExecutionPlan(
      'Create a Zoom meeting about "BECE revision" and email the link to teacher@school.edu',
      {
        zoom: { connected: true },
        gmail: { connected: true },
      }
    );
    expect(plan.intent).toBe("meeting_workflow");
    expect(plan.steps.some((s) => s.operation === "create_meeting")).toBe(true);
    expect(plan.steps.some((s) => s.operation === "send_email")).toBe(true);
    expect(planNeedsUserConfirmation(plan)).toBe(true);
    expect(plan.missingHints).toEqual([]);
    expect(formatPlanSummary(plan)).toContain("needs confirmation");
  });

  it("reports missing connections without inventing success", () => {
    const plan = buildExecutionPlan("Search my Gmail for invoices", {
      gmail: { connected: false },
    });
    expect(plan.steps[0]?.provider).toBe("gmail");
    expect(plan.missingHints.some((h) => h.includes("gmail"))).toBe(true);
  });

  it("plans Moodle assignments with optional calendar reminders", () => {
    const plan = buildExecutionPlan(
      "List my Moodle assignments and add calendar reminders",
      {
        moodle: { connected: true },
        outlook_calendar: { connected: true },
      }
    );
    expect(plan.steps.map((s) => s.operation)).toEqual([
      "list_courses",
      "list_assignments",
      "create_event",
    ]);
    expect(plan.steps[2]?.requiresConfirmation).toBe(true);
  });

  it("keeps drafts non-confirmational and sends confirmational", () => {
    const draft = buildExecutionPlan("Draft a Gmail reply about fees", {
      gmail: { connected: true },
    });
    expect(draft.steps.some((s) => s.operation === "draft_reply")).toBe(true);
    expect(draft.steps.find((s) => s.operation === "draft_reply")?.requiresConfirmation).toBe(
      false
    );

    const send = buildExecutionPlan("Send an email to a@b.com about fees", {
      gmail: { connected: true },
    });
    expect(send.steps[0]?.operation).toBe("send_email");
    expect(send.steps[0]?.requiresConfirmation).toBe(true);
  });

  it("returns helpful notes when unmapped", () => {
    const plan = buildExecutionPlan("hello there");
    expect(plan.intent).toBe("unmapped");
    expect(plan.steps).toEqual([]);
    expect(plan.notes[0]).toMatch(/Gmail|Drive|Outlook/i);
  });

  it("only emits server-allowlisted connector operations", () => {
    const samples = [
      'Create a Zoom meeting about "BECE" and email teacher@school.edu',
      "Search my Drive for syllabus and export notes",
      "List Moodle assignments and create a calendar event",
      "Search Notion for notes and append a page",
    ];
    for (const request of samples) {
      const plan = buildExecutionPlan(request, {
        zoom: { connected: true },
        gmail: { connected: true },
        google_drive: { connected: true },
        moodle: { connected: true },
        outlook_calendar: { connected: true },
        notion: { connected: true },
      });
      for (const s of plan.steps) {
        expect(isAllowedConnectorOperation(s.provider, s.operation)).toBe(true);
      }
    }
  });
});
