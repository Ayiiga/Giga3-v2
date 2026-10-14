/**
 * Phase 0 preservation locks for GigaLearn.
 * Academy upgrades must keep these invariants green.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CURRICULUM_LEVELS,
  CURRICULUM_SUBJECTS,
  GHANA_CURRICULA,
} from "../../web/lib/gigalearn/curriculumEngine";
import { EXAM_BOARDS, SUBJECTS, getSubject } from "../../web/lib/gigalearn/curricula";
import { GIGALEARN_PRIMARY_AREAS } from "../../web/lib/gigalearn/sections";
import { STUDIO_TOOLS } from "../../web/lib/gigalearn/studioTools";
import {
  ALL_GIGALEARN_TOOLS,
  PARENT_TOOLS,
  STUDENT_TOOLS,
  TEACHER_TOOLS,
} from "../../web/lib/gigalearn/tools";

const ROOT = resolve(__dirname, "../..");

describe("GigaLearn preservation baseline", () => {
  it("keeps the six primary areas and /gigalearn page wiring", () => {
    expect(GIGALEARN_PRIMARY_AREAS.map((a) => a.id)).toEqual([
      "student",
      "teacher",
      "create",
      "parent",
      "insight",
      "tutor",
    ]);

    const page = readFileSync(
      resolve(ROOT, "web/app/(marketing)/gigalearn/page.tsx"),
      "utf8"
    );
    expect(page).toContain('path: "/gigalearn"');
    expect(page).toContain("GigaLearnPageRoot");
    expect(existsSync(resolve(ROOT, "web/components/gigalearn/GigaLearnClient.tsx"))).toBe(
      true
    );
    expect(existsSync(resolve(ROOT, "web/components/gigalearn/hubs/StudentHub.tsx"))).toBe(
      true
    );
    expect(existsSync(resolve(ROOT, "web/components/gigalearn/AdaptiveTutor.tsx"))).toBe(
      true
    );
  });

  it("preserves Ghana curriculum, levels, and legacy subject aliases", () => {
    expect(GHANA_CURRICULA.map((c) => c.id).sort()).toEqual(["gh-ccp", "gh-shs"].sort());
    const levelIds = CURRICULUM_LEVELS.map((l) => l.id);
    for (const id of [
      "kg-1",
      "kg-2",
      "basic-1",
      "basic-6",
      "basic-7",
      "basic-9",
      "basic-10",
      "basic-12",
    ]) {
      expect(levelIds).toContain(id);
    }
    expect(CURRICULUM_SUBJECTS.some((s) => s.id === "mathematics")).toBe(true);
    expect(CURRICULUM_SUBJECTS.some((s) => s.id === "english-language")).toBe(true);
    // Deprecated aliases must still resolve for saved profiles.
    expect(getSubject("coding")?.id).toBeTruthy();
    expect(getSubject("ict")?.id).toBeTruthy();
    expect(EXAM_BOARDS.map((b) => b.id)).toEqual(
      expect.arrayContaining(["bece", "wassce", "waec", "jhs", "shs"])
    );
    expect(SUBJECTS.length).toBeGreaterThan(10);
  });

  it("preserves studio and learner generation tool ids", () => {
    const studioIds = STUDIO_TOOLS.map((t) => t.id);
    const studentIds = STUDENT_TOOLS.map((t) => t.id);
    const teacherIds = TEACHER_TOOLS.map((t) => t.id);
    const allIds = ALL_GIGALEARN_TOOLS.map((t) => t.id);
    for (const id of [
      "lesson-generator",
      "quiz-generator",
      "assignment-generator",
      "lesson-notes",
      "topic-explainer",
      "revision-guide",
    ]) {
      expect(studioIds).toContain(id);
    }
    for (const id of [
      "quiz-generator",
      "practice-questions",
      "exam-prep",
      "homework-explain",
      "study-plan",
    ]) {
      expect(studentIds).toContain(id);
    }
    expect(teacherIds).toEqual(expect.arrayContaining(["lesson-notes", "worksheet-generator"]));
    expect(PARENT_TOOLS.some((t) => t.id === "parent-summary")).toBe(true);
    expect(allIds.length).toBeGreaterThan(10);
  });

  it("keeps gigaLearnProgress schema, indexes, and Convex function exports", () => {
    const schema = readFileSync(resolve(ROOT, "convex/schema.ts"), "utf8");
    expect(schema).toContain("gigaLearnProgress: defineTable");
    expect(schema).toContain('.index("by_user_topic"');
    expect(schema).toContain('.index("by_user_updated"');
    expect(schema).toContain("orgEnrollments: defineTable");

    const progress = readFileSync(resolve(ROOT, "convex/gigaLearnProgress.ts"), "utf8");
    expect(progress).toMatch(/export const listProgress\s*=\s*query/);
    expect(progress).toMatch(/export const recordAssessment\s*=\s*mutation/);
    expect(progress).toMatch(/export const recordPractice\s*=\s*mutation/);
    expect(progress).toMatch(/export const recordAssessmentInternal\s*=\s*internalMutation/);

    const studio = readFileSync(resolve(ROOT, "convex/gigalearnStudio.ts"), "utf8");
    expect(studio).toMatch(/export const generateContent\s*=\s*action/);
    expect(studio).toContain("tryReserveInternal");

    const adaptive = readFileSync(resolve(ROOT, "convex/adaptiveLearning.ts"), "utf8");
    expect(adaptive).toMatch(/export const tutorTurn\s*=\s*action/);
    expect(adaptive).toMatch(/export const markAnswer\s*=\s*action/);
  });

  it("keeps offline + media library entry points and public media packs", () => {
    expect(existsSync(resolve(ROOT, "web/lib/gigalearn/offlineLessons.ts"))).toBe(true);
    expect(existsSync(resolve(ROOT, "web/lib/gigalearn/offlineProgressQueue.ts"))).toBe(true);
    expect(existsSync(resolve(ROOT, "web/lib/gigalearn/mediaLibrary/catalog.ghana.ts"))).toBe(
      true
    );
    expect(existsSync(resolve(ROOT, "web/public/gigalearn/media/ghana/kg2"))).toBe(true);
    expect(existsSync(resolve(ROOT, "web/public/sitemap-gigalearn.xml"))).toBe(true);
    const sitemap = readFileSync(resolve(ROOT, "web/public/sitemap-gigalearn.xml"), "utf8");
    expect(sitemap).toContain("https://www.giga3ai.com/gigalearn/");
  });

  it("keeps gigaLearnProgress untouched when Academy tables are present", () => {
    const schema = readFileSync(resolve(ROOT, "convex/schema.ts"), "utf8");
    expect(schema).toContain("gigaLearnProgress: defineTable");
    expect(schema).toContain('.index("by_user_topic"');
    // Academy tables are additive only.
    if (schema.includes("gigaLearnAcademyCourses")) {
      expect(schema).toContain("gigaLearnAcademyEnrolments: defineTable");
    }
  });
});
