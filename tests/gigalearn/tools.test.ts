import { describe, expect, it } from "vitest";
import { getGigaLearnTool } from "../../web/lib/gigalearn/tools";

describe("GigaLearn tool resolution", () => {
  it("returns role-specific metadata for duplicate tool ids", () => {
    const studentQuiz = getGigaLearnTool("quiz-generator", "student");
    const teacherQuiz = getGigaLearnTool("quiz-generator", "teacher");

    expect(studentQuiz?.label).toBe("Quiz generator");
    expect(teacherQuiz?.label).toBe("Class quiz");
    expect(studentQuiz?.placeholder).not.toBe(teacherQuiz?.placeholder);
  });

  it("resolves duplicate homework tools by section", () => {
    const student = getGigaLearnTool("homework-explain", "student");
    const parent = getGigaLearnTool("homework-explain", "parent");

    expect(student?.label).toBe("Homework help");
    expect(parent?.label).toBe("Homework guide");
  });

  it("keeps legacy id-only lookup for callers without section context", () => {
    expect(getGigaLearnTool("quiz-generator")?.section).toBe("student");
  });
});
