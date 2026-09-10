import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveGigaLearnPersona } from "../../web/lib/gigalearn/personaMap";
import { resolvePersonaForGigaLearnTool } from "../../convex/gigaPersonas";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("GigaLearn persona handoff", () => {
  it("maps BECE curriculum to bece tutor for practice tools", () => {
    expect(
      resolvePersonaForGigaLearnTool({ toolId: "practice-questions", curriculum: "bece" })
    ).toBe("bece_tutor");
    expect(resolveGigaLearnPersona({ toolId: "practice-questions", curriculum: "bece" })).toBe(
      "bece_tutor"
    );
  });

  it("maps WASSCE curriculum to wassce tutor", () => {
    expect(resolvePersonaForGigaLearnTool({ toolId: "lesson-notes", curriculum: "wassce" })).toBe(
      "wassce_tutor"
    );
    expect(resolveGigaLearnPersona({ curriculum: "wassce" })).toBe("wassce_tutor");
  });

  it("stores personaId on chat handoff payload", () => {
    expect(read("web/lib/gigalearn/chatHandoff.ts")).toContain("personaId?: GigaPersonaId");
    expect(read("web/components/gigalearn/GigaLearnHomeworkPanel.tsx")).toContain("personaId:");
    expect(read("web/components/chat/ChatShell.tsx")).toContain("changePersona(handoff.personaId)");
  });
});

describe("GigaLearn progress loop wiring", () => {
  it("defines server progress table and mutations", () => {
    expect(read("convex/schema.ts")).toContain("gigaLearnProgress:");
    expect(read("convex/gigaLearnProgress.ts")).toContain("recordAssessment");
    expect(read("convex/gigaLearnProgress.ts")).toContain("recordPractice");
    expect(read("convex/gigalearnStudio.ts")).toContain(
      "internal.gigaLearnProgress.recordAssessmentInternal"
    );
  });

  it("surfaces weaknesses in workspace UI", () => {
    expect(read("web/components/gigalearn/GigaLearnWorkspacePanel.tsx")).toContain(
      "Focus areas — practice then reassess"
    );
  });
});
