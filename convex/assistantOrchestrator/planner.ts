/**
 * Deterministic NL → structured connector plan (pure, unit-tested).
 * Does not call providers and never invents successful outcomes.
 */

import {
  toolRequiresConfirmation,
  type ConnectorToolName,
} from "../connectors/toolPolicy";
import type { ExternalConnectorId } from "../connectors/types";

export type PlanStepDraft = {
  stepId: string;
  provider: ExternalConnectorId;
  operation: ConnectorToolName;
  title: string;
  params: Record<string, unknown>;
  requiresConfirmation: boolean;
  /** Soft dependency on earlier stepIds (results may fill params later). */
  dependsOn: string[];
};

export type ExecutionPlanDraft = {
  goal: string;
  intent: string;
  steps: PlanStepDraft[];
  missingHints: string[];
  notes: string[];
};

export type ConnectedProviderMap = Partial<
  Record<ExternalConnectorId, { connected: boolean; accountLabel?: string | null }>
>;

const PROVIDERS: ExternalConnectorId[] = [
  "google_drive",
  "gmail",
  "outlook_calendar",
  "zoom",
  "moodle",
  "notion",
];

function step(
  id: string,
  provider: ExternalConnectorId,
  operation: ConnectorToolName,
  title: string,
  params: Record<string, unknown> = {},
  dependsOn: string[] = []
): PlanStepDraft {
  return {
    stepId: id,
    provider,
    operation,
    title,
    params,
    requiresConfirmation: toolRequiresConfirmation(operation),
    dependsOn,
  };
}

function extractQuoted(text: string): string | undefined {
  const m = text.match(/[“"]([^”"]{2,120})[”"]/) || text.match(/'([^']{2,120})'/);
  return m?.[1]?.trim();
}

function extractEmail(text: string): string | undefined {
  const m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m?.[0];
}

function extractQueryAfter(text: string, verbs: RegExp): string | undefined {
  const m = text.match(verbs);
  if (!m || m.index === undefined) return undefined;
  const rest = text.slice(m.index + m[0].length).trim();
  return rest.replace(/[.?!].*$/, "").trim().slice(0, 160) || undefined;
}

/**
 * Build an execution plan from natural language.
 * Conservative: only add steps when the request clearly implies them.
 */
export function buildExecutionPlan(
  request: string,
  connections: ConnectedProviderMap = {}
): ExecutionPlanDraft {
  const raw = request.trim();
  const text = raw.toLowerCase();
  const steps: PlanStepDraft[] = [];
  const notes: string[] = [];
  const missingHints: string[] = [];
  let intent = "general_assistant";

  if (!raw) {
    return {
      goal: "",
      intent: "empty",
      steps: [],
      missingHints: [],
      notes: ["Provide a goal for the executive assistant."],
    };
  }

  const wantsZoom =
    /\bzoom\b/.test(text) || /\bvideo (call|meeting)\b/.test(text) || /\bmeeting link\b/.test(text);
  const wantsCalendar =
    /\b(calendar|outlook|schedule|reschedule|availability|busy)\b/.test(text) ||
    (!wantsZoom &&
      /\b(create|book|add|cancel|update)\b.{0,40}\b(event|meeting|appointment)\b/.test(text));
  const wantsEmail =
    /\bgmail\b/.test(text) ||
    /\b(email|e-mail|inbox|draft|reply|send (an? )?mail)\b/.test(text);
  const wantsDrive =
    /\b(google )?drive\b/.test(text) ||
    /\b(document|doc|file|folder)\b/.test(text) && /\b(find|search|list|import|export|open)\b/.test(text);
  const wantsNotion =
    /\bnotion\b/.test(text) ||
    (/\b(page|notes?|wiki)\b/.test(text) && /\b(create|append|search|write)\b/.test(text));
  const wantsMoodle =
    /\bmoodle\b/.test(text) ||
    /\b(assignment|deadline|course|lms)\b/.test(text);

  const topic =
    extractQuoted(raw) ||
    extractQueryAfter(raw, /\b(?:about|regarding|for|on)\s+/i) ||
    undefined;

  // Moodle assignments → optional calendar reminders
  if (wantsMoodle) {
    intent = "lms_deadlines";
    steps.push(
      step("m1", "moodle", "list_courses", "List accessible Moodle courses"),
      step(
        "m2",
        "moodle",
        "list_assignments",
        "List assignments and deadlines",
        { courseIds: [] },
        ["m1"]
      )
    );
    if (wantsCalendar || /\bremind|calendar|schedule\b/.test(text)) {
      steps.push(
        step(
          "m3",
          "outlook_calendar",
          "create_event",
          "Create calendar reminders for upcoming assignments (after confirmation)",
          {
            subject: topic ? `Assignment: ${topic}` : "Moodle assignment reminder",
            startIso: "",
            endIso: "",
            body: "Created by Giga3 Executive Assistant from Moodle deadlines.",
          },
          ["m2"]
        )
      );
    }
  }

  // Drive search / import
  if (wantsDrive || (/\b(find|search|look up)\b/.test(text) && /\b(doc|file|notes?)\b/.test(text))) {
    intent = intent === "general_assistant" ? "drive_research" : intent;
    const q = topic || extractQueryAfter(raw, /\b(?:find|search|look up)\s+/i) || "";
    steps.push(
      step("d1", "google_drive", "search_files", `Search Drive${q ? ` for “${q}”` : ""}`, {
        query: q,
      })
    );
    if (/\b(read|open|import|summar)/.test(text)) {
      steps.push(
        step(
          "d2",
          "google_drive",
          "read_file",
          "Read a selected Drive file (fileId required)",
          { fileId: "", mimeType: "application/vnd.google-apps.document" },
          ["d1"]
        )
      );
    }
    if (/\bexport|save (to|into) drive|upload (to )?drive\b/.test(text)) {
      steps.push(
        step(
          "d3",
          "google_drive",
          "export_file",
          "Export a generated document to Drive (confirmation required)",
          {
            name: topic ? `${topic}.txt` : "Giga3 export",
            content: "",
          },
          ["d1"]
        )
      );
    }
  }

  // Gmail (skip dedicated email intent when Zoom already owns a meeting+invite flow)
  if (wantsEmail && !wantsZoom) {
    intent = intent === "general_assistant" ? "email_workflow" : intent;
    const q = topic || "";
    if (/\b(draft|reply)\b/.test(text)) {
      steps.push(
        step("g1", "gmail", "search_messages", `Search Gmail${q ? ` for “${q}”` : ""}`, {
          query: q,
        }),
        step(
          "g2",
          "gmail",
          "draft_reply",
          "Draft an email reply (not sent)",
          {
            to: extractEmail(raw) || "",
            subject: topic ? `Re: ${topic}` : "Follow-up",
            body: "",
          },
          ["g1"]
        )
      );
    } else if (/\bsend\b/.test(text)) {
      steps.push(
        step(
          "g1",
          "gmail",
          "send_email",
          "Send email (confirmation required)",
          {
            to: extractEmail(raw) || "",
            subject: topic || "Message from Giga3",
            body: "",
          }
        )
      );
      notes.push("Email body/subject should be reviewed before confirmation.");
    } else {
      steps.push(
        step("g1", "gmail", "search_messages", `Search Gmail${q ? ` for “${q}”` : ""}`, {
          query: q || "in:inbox newer_than:14d",
        }),
        step(
          "g2",
          "gmail",
          "summarise_messages",
          "Summarise selected messages",
          { messageIds: [] },
          ["g1"]
        )
      );
    }
  }

  // Zoom meeting (+ optional email of link)
  if (wantsZoom) {
    intent = "meeting_workflow";
    steps.push(
      step(
        "z1",
        "zoom",
        "create_meeting",
        "Create Zoom meeting link (confirmation required)",
        {
          topic: topic || "Giga3 meeting",
          durationMinutes: 30,
        }
      )
    );
    if (wantsEmail || /\b(send|email|share).{0,20}(link|invite)\b/.test(text)) {
      steps.push(
        step(
          "z2",
          "gmail",
          "send_email",
          "Email the Zoom link (confirmation required)",
          {
            to: extractEmail(raw) || "",
            subject: topic ? `Zoom: ${topic}` : "Zoom meeting invite",
            body: "Zoom join link will be filled after the meeting is created.",
          },
          ["z1"]
        )
      );
    }
  }

  // Calendar event / availability
  if (wantsCalendar && !steps.some((s) => s.provider === "outlook_calendar")) {
    intent = intent === "general_assistant" ? "calendar_workflow" : intent;
    if (/\bavailability|free\/busy|when am i free\b/.test(text)) {
      steps.push(
        step("c1", "outlook_calendar", "search_availability", "Check calendar availability", {
          startIso: "",
          endIso: "",
          timeZone: "UTC",
        })
      );
    } else if (/\bcancel\b/.test(text)) {
      steps.push(
        step(
          "c1",
          "outlook_calendar",
          "cancel_event",
          "Cancel a calendar event (confirmation required)",
          { eventId: "" }
        )
      );
      notes.push("Provide the eventId from a prior list_events result before confirming cancel.");
    } else if (/\b(update|reschedule|move)\b/.test(text)) {
      steps.push(
        step(
          "c1",
          "outlook_calendar",
          "update_event",
          "Update a calendar event (confirmation required)",
          { eventId: "", patch: {} }
        )
      );
    } else if (/\b(create|book|add|schedule)\b/.test(text) || wantsZoom === false) {
      steps.push(
        step(
          "c1",
          "outlook_calendar",
          "create_event",
          "Create calendar event (confirmation required)",
          {
            subject: topic || "Giga3 scheduled event",
            startIso: "",
            endIso: "",
            timeZone: "UTC",
            body: "",
          }
        )
      );
      notes.push("Set startIso/endIso (ISO-8601) before confirming the event.");
    } else {
      steps.push(
        step("c1", "outlook_calendar", "list_events", "List upcoming calendar events", {
          query: topic || "",
        })
      );
    }
  }

  // Notion
  if (wantsNotion) {
    intent = intent === "general_assistant" ? "notion_notes" : intent;
    if (/\b(create|new page|write)\b/.test(text)) {
      steps.push(
        step(
          "n1",
          "notion",
          "create_page",
          "Create Notion page (confirmation required)",
          {
            parentPageId: "",
            title: topic || "Giga3 note",
            content: "",
          }
        )
      );
      notes.push("parentPageId must be a page the Notion integration can access.");
    } else if (/\bappend\b/.test(text)) {
      steps.push(
        step(
          "n1",
          "notion",
          "append_page",
          "Append content to a Notion page (confirmation required)",
          { pageId: "", content: "" }
        )
      );
    } else {
      steps.push(
        step("n1", "notion", "search_pages", `Search Notion${topic ? ` for “${topic}”` : ""}`, {
          query: topic || "",
        })
      );
    }
  }

  if (!steps.length) {
    notes.push(
      "Could not map that request to connector operations. Try mentioning Gmail, Drive, Outlook, Zoom, Moodle, or Notion and the action (search, draft, schedule, create meeting)."
    );
    intent = "unmapped";
  }

  for (const provider of PROVIDERS) {
    if (!steps.some((s) => s.provider === provider)) continue;
    const conn = connections[provider];
    if (!conn?.connected) {
      missingHints.push(
        `${provider} is not connected. Connect it under Automation → Integrations before execution.`
      );
    }
  }

  // De-dupe steps by stepId
  const seen = new Set<string>();
  const unique = steps.filter((s) => {
    if (seen.has(s.stepId)) return false;
    seen.add(s.stepId);
    return true;
  });

  return {
    goal: raw.slice(0, 2000),
    intent,
    steps: unique,
    missingHints: [...new Set(missingHints)],
    notes,
  };
}

export function planNeedsUserConfirmation(plan: ExecutionPlanDraft): boolean {
  return plan.steps.some((s) => s.requiresConfirmation);
}

export function formatPlanSummary(plan: ExecutionPlanDraft): string {
  if (!plan.steps.length) {
    return plan.notes[0] || "No executable steps.";
  }
  const lines = [
    `Goal: ${plan.goal}`,
    `Intent: ${plan.intent}`,
    "Steps:",
    ...plan.steps.map(
      (s, i) =>
        `${i + 1}. [${s.provider}/${s.operation}] ${s.title}` +
        (s.requiresConfirmation ? " — needs confirmation" : "")
    ),
  ];
  if (plan.missingHints.length) {
    lines.push("Blocked until connected:", ...plan.missingHints.map((h) => `- ${h}`));
  }
  if (plan.notes.length) {
    lines.push("Notes:", ...plan.notes.map((n) => `- ${n}`));
  }
  return lines.join("\n");
}
