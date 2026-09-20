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
      "strengthen these skills"
    );
  });
});

describe("GigaLearn interactive practice wiring", () => {
  it("exposes practice session in tool panel for interactive tools", () => {
    expect(read("web/components/gigalearn/GigaLearnToolPanel.tsx")).toContain("PracticeSession");
    expect(read("web/components/gigalearn/GigaLearnToolPanel.tsx")).toContain(
      "Answering is free"
    );
  });

  it("parses questions in generation hook for practice tools", () => {
    expect(read("web/hooks/useGigaLearnGeneration.ts")).toContain("parseQuestionsFromContent");
    expect(read("web/hooks/useGigaLearnGeneration.ts")).toContain("getPracticeFallbackQuestions");
  });

  it("resolves duplicate tool ids using section context during generation", () => {
    expect(read("web/hooks/useGigaLearnGeneration.ts")).toContain(
      "getGigaLearnTool(args.toolId, args.section)"
    );
    expect(read("web/lib/gigalearn/tools.ts")).toContain("section?: GigaLearnToolSection");
  });

  it("requests structured JSON from studio for practice tools", () => {
    expect(read("convex/gigalearnStudio.ts")).toContain('"questions"');
    expect(read("convex/gigalearnStudio.ts")).toContain("practice-questions");
  });

  it("wires teaching feedback and weak-topic practice", () => {
    expect(read("web/lib/gigalearn/teachingFeedback.ts")).toContain("buildTeachingFeedback");
    expect(read("web/components/gigalearn/GigaLearnToolPanel.tsx")).toContain(
      "Practice what you need most"
    );
    expect(read("web/lib/gigalearn/practiceGamification.ts")).toContain("computeAnswerStreak");
  });

  it("records practice completion locally without credits", () => {
    expect(read("web/lib/gigalearn/workspace.ts")).toContain("recordPracticeCompletion");
    expect(read("web/hooks/useGigaLearnGeneration.ts")).not.toContain("recordPracticeCompletion");
  });
});
