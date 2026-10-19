/**
 * Learner functionality + measurable engagement (no visual redesign).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GIGALEARN_ENGAGEMENT_EVENTS } from "../../convex/gigaLearnEngagement";
import { EXAM_PRACTICE_DESTINATIONS } from "../../web/lib/gigalearn/examPractice/centreConfig";
import { ENGAGEMENT_CHECKLIST } from "../../web/lib/engagement/interests";
import { ENGAGEMENT_CHECKLIST_IDS } from "../../convex/engagementControls";

const ROOT = resolve(__dirname, "../..");

describe("GigaLearn learner engagement", () => {
  it("defines allowlisted engagement counter keys without schema tables", () => {
    expect(GIGALEARN_ENGAGEMENT_EVENTS.enrol).toBe("gigalearn.enrolments");
    expect(GIGALEARN_ENGAGEMENT_EVENTS.assessment_submit).toBe(
      "gigalearn.assessment_submits"
    );
    expect(GIGALEARN_ENGAGEMENT_EVENTS.exam_centre_open).toBe(
      "gigalearn.exam_centre_open"
    );
    const src = readFileSync(resolve(ROOT, "convex/gigaLearnEngagement.ts"), "utf8");
    expect(src).toContain("platformCounters");
    expect(src).toContain("listMyNextSteps");
    expect(src).toContain("recordLearnerEvent");
    expect(src).not.toContain("defineTable");
  });

  it("wires enrolment / pathway / assessment submits to engagement bumps", () => {
    const academy = readFileSync(resolve(ROOT, "convex/gigaLearnAcademy.ts"), "utf8");
    const assessments = readFileSync(
      resolve(ROOT, "convex/gigaLearnAcademyAssessments.ts"),
      "utf8"
    );
    expect(academy).toContain("bumpLearnerEventInternal");
    expect(academy).toContain('event: "enrol"');
    expect(academy).toContain('event: "pathway_update"');
    expect(assessments).toContain('event: "assessment_submit"');
  });

  it("offers enrolled-course assessment picker when course query is missing", () => {
    const panel = readFileSync(
      resolve(ROOT, "web/components/gigalearn/academy/AcademyAssessmentPanel.tsx"),
      "utf8"
    );
    expect(panel).toContain("listMyEnrolments");
    expect(panel).toContain("Enrolled courses for assessment");
    expect(panel).toContain("assess_hub_open");
  });

  it("surfaces server next steps on Academy home and records home opens", () => {
    const home = readFileSync(
      resolve(ROOT, "web/components/gigalearn/academy/AcademyHome.tsx"),
      "utf8"
    );
    expect(home).toContain("listMyNextSteps");
    expect(home).toContain("Your next steps");
    expect(home).toContain("academy_home_open");
    expect(home).toContain("not invented recommendations");
  });

  it("keeps Teacher Promotion practice linked with intent and engagement events", () => {
    expect(EXAM_PRACTICE_DESTINATIONS.teacherHub).toContain("intent=promotion-practice");
    const exam = readFileSync(
      resolve(ROOT, "web/components/gigalearn/exam/ExamPracticeCentre.tsx"),
      "utf8"
    );
    expect(exam).toContain("exam_centre_open");
    expect(exam).toContain("teacher_hub_from_exam");
    expect(exam).toContain("student_learn_from_exam");
    expect(exam).toContain("Awaiting sources");
    const client = readFileSync(
      resolve(ROOT, "web/components/gigalearn/GigaLearnClient.tsx"),
      "utf8"
    );
    expect(client).toContain("promotion-practice-intent");
  });

  it("keeps client and convex checklist catalogs aligned for Academy next step", () => {
    expect(ENGAGEMENT_CHECKLIST_IDS).toContain("academy_next_step");
    expect(ENGAGEMENT_CHECKLIST.some((c) => c.id === "academy_next_step")).toBe(true);
    expect(ENGAGEMENT_CHECKLIST.find((c) => c.id === "academy_next_step")?.href).toBe(
      "/gigalearn/academy/"
    );
  });
});
