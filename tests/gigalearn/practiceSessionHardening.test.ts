import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("GigaLearn practice session hardening", () => {
  it("reacts to focusWeakRevision prop changes", () => {
    expect(read("web/components/gigalearn/PracticeSession.tsx")).toContain(
      "useEffect(() => {\n    if (!focusWeakRevision) return;"
    );
    expect(read("web/components/gigalearn/PracticeSession.tsx")).toContain('setMode("revision")');
  });

  it("clamps restored question index to active set bounds", () => {
    expect(read("web/components/gigalearn/PracticeSession.tsx")).toContain("safeIndex");
    expect(read("web/components/gigalearn/PracticeSession.tsx")).toContain(
      "index >= activeQuestions.length"
    );
  });

  it("resets weak-revision focus when switching tools", () => {
    expect(read("web/components/gigalearn/GigaLearnToolPanel.tsx")).toContain(
      "setFocusWeakRevision(false)"
    );
  });

  it("persists profile with explicit selected values", () => {
    const source = read("web/components/gigalearn/GigaLearnToolPanel.tsx");
    expect(source).toContain("persistProfile({ examBoard: value })");
    expect(source).toContain("persistProfile({ subject: value })");
    expect(source).toContain("persistProfile({ level: value })");
  });

  it("does not call generation from practice completion path", () => {
    expect(read("web/hooks/useGigaLearnGeneration.ts")).toContain("generateContent");
    expect(read("web/components/gigalearn/PracticeSession.tsx")).not.toContain("generateContent");
    expect(read("web/lib/gigalearn/workspace.ts")).toContain("recordPracticeCompletion");
  });
});
