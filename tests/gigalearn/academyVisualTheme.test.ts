/**
 * Academy visual design tokens — presentation only; no behaviour changes.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACADEMY_COLOUR_TOKENS,
  ACADEMY_STUDIO_CLASS,
  ACADEMY_SURFACE_CLASS,
  studioThemeClass,
} from "../../web/lib/gigalearn/academy/visualTheme";
import { LEARNING_STUDIOS } from "../../web/lib/gigalearn/academy/learningStudios";

const ROOT = resolve(__dirname, "../..");

describe("Academy visual theme", () => {
  it("defines surface and studio colour tokens from the design brief", () => {
    expect(ACADEMY_COLOUR_TOKENS.hero.bg).toBe("#4C1D95");
    expect(ACADEMY_COLOUR_TOKENS.hero.bgAlt).toBe("#312E81");
    expect(ACADEMY_COLOUR_TOKENS.dashboard.bg).toBe("#F3E8FF");
    expect(ACADEMY_COLOUR_TOKENS.practice.bg).toBe("#1E3A8A");
    expect(ACADEMY_COLOUR_TOKENS.performance.bg).toBe("#DCFCE7");
    expect(ACADEMY_COLOUR_TOKENS.certificates.bg).toBe("#FEF3C7");
    expect(ACADEMY_COLOUR_TOKENS.catalogue.bg).toBe("#FFFFFF");
    expect(ACADEMY_COLOUR_TOKENS.shell.bg).toBe("#F5F0FF");
    expect(ACADEMY_COLOUR_TOKENS.bece.bg).toBe("#EDE9FE");
    expect(ACADEMY_COLOUR_TOKENS.teacher.bg).toBe("#14532D");
    expect(ACADEMY_COLOUR_TOKENS.teacher.accent).toBe("#FACC15");
    expect(Object.keys(ACADEMY_COLOUR_TOKENS.studios)).toHaveLength(7);
  });

  it("maps every Learning Studio id to a distinct theme class", () => {
    for (const studio of LEARNING_STUDIOS) {
      expect(studioThemeClass(studio.id)).toContain(`academy-visual-studio--${studio.id}`);
      expect(ACADEMY_STUDIO_CLASS[studio.id as keyof typeof ACADEMY_STUDIO_CLASS]).toBeTruthy();
    }
    expect(ACADEMY_SURFACE_CLASS.hero).toBe("academy-visual-hero");
    expect(ACADEMY_SURFACE_CLASS.practice).toBe("academy-visual-practice");
    expect(ACADEMY_SURFACE_CLASS.shell).toBe("academy-visual-shell");
    expect(ACADEMY_SURFACE_CLASS.bece).toBe("academy-visual-bece");
    expect(ACADEMY_SURFACE_CLASS.teacher).toBe("academy-visual-teacher");
  });

  it("applies visual classes on AcademyHome without inventing progress copy", () => {
    const home = readFileSync(
      resolve(ROOT, "web/components/gigalearn/academy/AcademyHome.tsx"),
      "utf8"
    );
    expect(home).toContain("ACADEMY_SURFACE_CLASS");
    expect(home).toContain("ACADEMY_SURFACE_CLASS.hero");
    expect(home).toContain("ACADEMY_SURFACE_CLASS.dashboard");
    expect(home).toContain("ACADEMY_SURFACE_CLASS.practice");
    expect(home).toContain("ACADEMY_SURFACE_CLASS.performance");
    expect(home).toContain("ACADEMY_SURFACE_CLASS.certificates");
    expect(home).toContain("ACADEMY_SURFACE_CLASS.catalogue");
    expect(home).toContain("studioThemeClass");
    expect(home).toContain("LearningProgressRing");
    expect(home).toContain("academy-visual-quick");
    expect(home).toContain("Coming soon");
    expect(home).toContain("Available");
    expect(home).toContain("we will not invent progress");
    expect(home).not.toContain("localStorage.setItem");
  });

  it("styles Exam Practice BECE and Teacher centres with distinct surfaces", () => {
    const exam = readFileSync(
      resolve(ROOT, "web/components/gigalearn/exam/ExamPracticeCentre.tsx"),
      "utf8"
    );
    expect(exam).toContain("ACADEMY_SURFACE_CLASS.shell");
    expect(exam).toContain("exam-landing-banner");
    expect(exam).toContain("exam-landing-banner--bece");
    expect(exam).toContain("exam-ghana-stripe");
    expect(exam).toContain("Start Free {EXAM_PRACTICE_FREE_QUESTION_COUNT} Questions");
    expect(exam).toContain('data-testid="bece-practice-ready"');
    expect(exam).toContain('data-testid="teacher-promotion-bank-ready"');
    expect(exam).not.toContain("0248");
    // Anti-MoMo copy is allowed; unofficial activation flows are not.
    expect(exam.toLowerCase()).not.toContain("copy momo");
    expect(exam.toLowerCase()).not.toContain("whatsapp sir");
    expect(exam.toLowerCase()).not.toContain("i have paid");
  });

  it("ships CSS tokens with reduced-motion and focus styles", () => {
    const css = readFileSync(resolve(ROOT, "web/styles/globals.css"), "utf8");
    expect(css).toContain(".academy-visual-hero");
    expect(css).toContain(".academy-visual-shell");
    expect(css).toContain(".academy-visual-bece");
    expect(css).toContain(".academy-visual-teacher");
    expect(css).toContain(".academy-visual-nav-link--active");
    expect(css).toContain(".academy-visual-studio--giga-ai");
    expect(css).toContain(".academy-visual-studio--giga-innovation");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain(".academy-visual-cta:focus-visible");
  });

  it("lays out Academy summary on mobile without clipping as a layout fix", () => {
    const css = readFileSync(resolve(ROOT, "web/styles/globals.css"), "utf8");
    expect(css).toContain(".academy-visual-stat-grid");
    expect(css).toContain(".academy-visual-stat-label");
    expect(css).toContain(".academy-visual-course-card__body");
    expect(css).toContain(".academy-visual-course-card__copy");
    expect(css).toMatch(/\.academy-visual-shell\s*\{[^}]*min-width:\s*0/s);
    expect(css).toMatch(/\.academy-visual-panel\s*\{[^}]*min-width:\s*0/s);
    // Do not use overflow clip as a substitute for fixing flex/grid children.
    expect(css).not.toMatch(/\.academy-visual-shell\s*\{[^}]*overflow-x:\s*clip/s);
    expect(css).not.toMatch(/\.academy-visual-panel\s*\{[^}]*overflow-x:\s*clip/s);
    expect(css).not.toMatch(/\.academy-visual-dashboard\s*\{[^}]*overflow-x:\s*clip/s);
    expect(css).toMatch(
      /\.academy-visual-course-card\s*\{[^}]*flex-direction:\s*column/s
    );
    expect(css).toMatch(
      /@media \(min-width: 640px\)\s*\{\s*\.academy-visual-course-card\s*\{[^}]*flex-direction:\s*row/s
    );

    const home = readFileSync(
      resolve(ROOT, "web/components/gigalearn/academy/AcademyHome.tsx"),
      "utf8"
    );
    expect(home).toContain("academy-visual-stat-grid");
    expect(home).toContain("academy-visual-course-card__body");
    expect(home).toContain("w-full shrink-0 sm:w-auto");

    const detail = readFileSync(
      resolve(ROOT, "web/components/gigalearn/academy/AcademyCourseDetail.tsx"),
      "utf8"
    );
    expect(detail).toContain("ACADEMY_SURFACE_CLASS.dashboard");
    expect(detail).toContain("ACADEMY_SURFACE_CLASS.catalogue");
    expect(detail).toContain("friendlyAcademyEnrolError");
    expect(detail).toContain("ALREADY_ENROLLED_MESSAGE");
    expect(detail).toContain("Continue course");
  });
});
