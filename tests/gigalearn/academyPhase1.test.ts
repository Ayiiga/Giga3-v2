/**
 * GigaLearn Academy Phase 1 — catalogue, pathways, entitlement helpers, preservation.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  filterAcademyCourses,
  getBuiltinAcademyCourse,
  listBuiltinAcademyCourses,
  resolveResumeLesson,
  toAcademyListItem,
} from "../../web/lib/gigalearn/academy/courseCatalog";
import { hrefForAcademyResource } from "../../web/lib/gigalearn/academy/resourceLinks";
import { GIGALEARN_PRIMARY_AREAS } from "../../web/lib/gigalearn/sections";
import { EXAM_BOARDS, getSubject } from "../../web/lib/gigalearn/curricula";

const ROOT = resolve(__dirname, "../..");

describe("GigaLearn Academy Phase 1", () => {
  it("ships a built-in catalogue with searchable filters", () => {
    const courses = listBuiltinAcademyCourses();
    expect(courses.length).toBeGreaterThanOrEqual(4);
    const items = courses.map(toAcademyListItem);
    const maths = filterAcademyCourses(items, { query: "bece", subject: "Mathematics" });
    expect(maths.some((c) => c.slug === "bece-maths-foundations")).toBe(true);
    const early = filterAcademyCourses(items, { category: "Early years" });
    expect(early.some((c) => c.slug === "kg2-ghana-discover")).toBe(true);
    const credits = filterAcademyCourses(items, { query: "teacher" });
    expect(credits.some((c) => c.access === "credits")).toBe(true);
  });

  it("course details expose modules, objectives, and access labels", () => {
    const course = getBuiltinAcademyCourse("wassce-english-writing");
    expect(course).toBeTruthy();
    expect(course!.learningObjectives.length).toBeGreaterThan(0);
    expect(course!.prerequisites.length).toBeGreaterThan(0);
    expect(course!.modules.length).toBeGreaterThan(0);
    expect(course!.modules[0]!.lessons.length).toBeGreaterThan(0);
    expect(course!.certificateEligible).toBe(true);
    expect(course!.access).toBe("free");
  });

  it("pathways reference existing GigaLearn resources instead of duplicating curriculum", () => {
    const course = getBuiltinAcademyCourse("bece-maths-foundations")!;
    const refs = course.modules.flatMap((m) =>
      m.lessons.map((l) => l.resource).filter(Boolean)
    );
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      expect(["gigalearn_tab", "gigalearn_tool", "curriculum_subject", "media_item"]).toContain(
        ref!.kind
      );
    }
    const href = hrefForAcademyResource({
      kind: "gigalearn_tab",
      tab: "tutor",
      label: "Tutor",
    });
    expect(href).toContain("/gigalearn");
    expect(href).toContain("tab=tutor");
  });

  it("resume helper returns first lesson or saved checkpoint", () => {
    const course = getBuiltinAcademyCourse("kg2-ghana-discover")!;
    const first = resolveResumeLesson(course);
    expect(first?.moduleId).toBe(course.modules[0]!.id);
    expect(first?.lessonId).toBe(course.modules[0]!.lessons[0]!.id);
    const mid = resolveResumeLesson(
      course,
      course.modules[0]!.id,
      course.modules[0]!.lessons[0]!.id
    );
    expect(mid?.lessonId).toBe(course.modules[0]!.lessons[0]!.id);
  });

  it("keeps six GigaLearn hubs and curriculum aliases intact", () => {
    expect(GIGALEARN_PRIMARY_AREAS).toHaveLength(6);
    expect(getSubject("coding")?.id).toBeTruthy();
    expect(EXAM_BOARDS.map((b) => b.id)).toEqual(
      expect.arrayContaining(["bece", "wassce"])
    );
  });

  it("adds Academy routes and additive Convex schema without removing progress tables", () => {
    expect(existsSync(resolve(ROOT, "web/app/(marketing)/gigalearn/academy/page.tsx"))).toBe(
      true
    );
    expect(
      existsSync(resolve(ROOT, "web/app/(marketing)/gigalearn/academy/course/page.tsx"))
    ).toBe(true);
    expect(existsSync(resolve(ROOT, "web/app/(marketing)/gigalearn/academy/my/page.tsx"))).toBe(
      true
    );
    expect(
      existsSync(resolve(ROOT, "web/app/(marketing)/gigalearn/academy/author/page.tsx"))
    ).toBe(true);

    const schema = readFileSync(resolve(ROOT, "convex/schema.ts"), "utf8");
    expect(schema).toContain("gigaLearnProgress: defineTable");
    expect(schema).toContain("gigaLearnAcademyCourses: defineTable");
    expect(schema).toContain("gigaLearnAcademyEnrolments: defineTable");
    expect(schema).toContain("orgEnrollments: defineTable");
    expect(schema).toContain('.index("by_user_course"');

    const academy = readFileSync(resolve(ROOT, "convex/gigaLearnAcademy.ts"), "utf8");
    expect(academy).toMatch(/export const listPublishedCourses\s*=\s*query/);
    expect(academy).toMatch(/export const enrolInCourse\s*=\s*mutation/);
    expect(academy).toMatch(/export const updatePathwayProgress\s*=\s*mutation/);
    expect(academy).toMatch(/export const upsertAuthoredCourse\s*=\s*mutation/);
    expect(academy).toContain("You are already enrolled");
    expect(academy).toContain("gigaLearnProgress");
    // Must not call progress mutations from Academy module.
    expect(academy).not.toMatch(/gigaLearnProgress\.(recordAssessment|recordPractice)/);

    const sitemap = readFileSync(resolve(ROOT, "web/public/sitemap-gigalearn.xml"), "utf8");
    expect(sitemap).toContain("/gigalearn/academy/");
  });

  it("catalogue and detail UI components exist (mobile-first class patterns)", () => {
    const catalogue = readFileSync(
      resolve(ROOT, "web/components/gigalearn/academy/AcademyCatalogue.tsx"),
      "utf8"
    );
    expect(catalogue).toContain("min-h-11");
    expect(catalogue).toContain("sm:grid-cols-2");
    expect(catalogue).toContain("Search");

    const detail = readFileSync(
      resolve(ROOT, "web/components/gigalearn/academy/AcademyCourseDetail.tsx"),
      "utf8"
    );
    expect(detail).toContain("Enrol in course");
    expect(detail).toContain("Learning pathway");
    // Enrolment goes through Convex mutation, not localStorage as source of truth.
    expect(detail).toContain("enrolInCourse");
    expect(detail).not.toContain('localStorage.setItem("academy_enrolment"');
  });
});
