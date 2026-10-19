/**
 * Integration checks for Academy Phase 1 (PR #548) + Exam Practice Phase B (PR #549).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BECE_SUBJECTS_AVAILABLE } from "../../web/lib/gigalearn/examPractice/centreConfig";
import { LEARNING_STUDIOS } from "../../web/lib/gigalearn/academy/learningStudios";
import { listBuiltinAcademyCourses } from "../../web/lib/gigalearn/academy/courseCatalog";

const ROOT = resolve(__dirname, "../..");

describe("Academy + Exam Practice integration", () => {
  it("keeps both Academy landing and Exam Practice routes", () => {
    expect(existsSync(resolve(ROOT, "web/app/(marketing)/gigalearn/academy/page.tsx"))).toBe(
      true
    );
    expect(
      existsSync(resolve(ROOT, "web/app/(marketing)/gigalearn/academy/courses/page.tsx"))
    ).toBe(true);
    expect(existsSync(resolve(ROOT, "web/app/(marketing)/gigalearn/exam/page.tsx"))).toBe(true);
    expect(existsSync(resolve(ROOT, "web/components/gigalearn/academy/AcademyHome.tsx"))).toBe(
      true
    );
    expect(
      existsSync(resolve(ROOT, "web/components/gigalearn/exam/ExamPracticeCentre.tsx"))
    ).toBe(true);
  });

  it("AcademyChrome includes Exam Practice without dropping Phase 1 destinations", () => {
    const chrome = readFileSync(
      resolve(ROOT, "web/components/gigalearn/academy/AcademyChrome.tsx"),
      "utf8"
    );
    expect(chrome).toContain("/gigalearn/exam/");
    expect(chrome).toContain('label: "Home"');
    expect(chrome).toContain('label: "Courses"');
    expect(chrome).toContain('label: "Practice"');
    expect(chrome).toContain('label: "Exam Practice"');
    expect(chrome).toContain("/gigalearn/academy/certificates/");
    expect(chrome).toContain("/gigalearn/academy/verify/");
    expect(chrome).toContain("/gigalearn/academy/author/");
    // Single Exam Practice entry (not duplicated).
    expect(chrome.split("/gigalearn/exam/").length - 1).toBe(1);
  });

  it("sitemap lists academy, courses, and exam", () => {
    const sitemap = readFileSync(resolve(ROOT, "web/public/sitemap-gigalearn.xml"), "utf8");
    expect(sitemap).toContain("/gigalearn/academy/");
    expect(sitemap).toContain("/gigalearn/academy/courses/");
    expect(sitemap).toContain("/gigalearn/exam/");
  });

  it("preserves BECE empty bank and studio honesty after integration", () => {
    expect(BECE_SUBJECTS_AVAILABLE).toHaveLength(0);
    expect(LEARNING_STUDIOS.some((s) => s.status === "planned")).toBe(true);
    expect(LEARNING_STUDIOS.some((s) => s.status === "available" && s.href)).toBe(true);
    expect(listBuiltinAcademyCourses().length).toBeGreaterThanOrEqual(4);

    const schema = readFileSync(resolve(ROOT, "convex/schema.ts"), "utf8");
    // No new exam question-bank table in these phases.
    expect(schema).not.toMatch(/gigaLearnExamQuestions|examPracticeQuestions/);
  });

  it("does not change grading or certificate modules in these PRs", () => {
    // Integration branch should still contain Academy assessment/certificate modules.
    expect(existsSync(resolve(ROOT, "convex/gigaLearnAcademyAssessments.ts"))).toBe(true);
    expect(existsSync(resolve(ROOT, "convex/gigaLearnAcademyCertificates.ts"))).toBe(true);
    const examUi = readFileSync(
      resolve(ROOT, "web/components/gigalearn/exam/ExamPracticeCentre.tsx"),
      "utf8"
    );
    expect(examUi).not.toContain("submitAssessmentAttempt");
    expect(examUi).toContain("listProgress");
  });
});
