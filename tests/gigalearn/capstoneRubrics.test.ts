import { describe, expect, it } from "vitest";
import {
  getTechnologyCapstoneRubric,
  TECHNOLOGY_CAPSTONE_COURSES,
  validateCapstoneRubric,
} from "../../web/lib/gigalearn/academy/capstoneRubrics";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("GigaLearn Technology capstone rubric foundation", () => {
  it("defines a versioned, valid rubric for each approved Technology course", () => {
    expect(TECHNOLOGY_CAPSTONE_COURSES).toEqual([
      "ai-machine-learning",
      "robotics-intelligent-systems",
      "mobile-app-development",
      "website-pwa-development",
    ]);
    for (const slug of TECHNOLOGY_CAPSTONE_COURSES) {
      const rubric = getTechnologyCapstoneRubric(slug);
      expect(rubric).not.toBeNull();
      expect(validateCapstoneRubric(rubric!)).toBe(true);
      expect(rubric!.passMark).toBe(75);
      expect(rubric!.criteria.reduce((sum, item) => sum + item.weight, 0)).toBe(100);
    }
  });

  it("does not expose a rubric for unapproved or legacy course slugs", () => {
    expect(getTechnologyCapstoneRubric("other-digital-technologies")).toBeNull();
    expect(getTechnologyCapstoneRubric("bece-maths-foundations")).toBeNull();
  });

  it("adds a server-owned capstone evidence and review record without changing existing attempt history", () => {
    const schema = readFileSync(resolve(__dirname, "../../convex/schema.ts"), "utf8");
    expect(schema).toContain("gigaLearnAcademyCapstones: defineTable");
    expect(schema).toContain("artifactStorageId: v.optional(v.id(\"_storage\"))");
    expect(schema).toContain("rubricSnapshotJson: v.string()");
    expect(schema).toContain("criterionScoresJson: v.optional(v.string())");
    expect(schema).toContain("confidence: v.optional(v.number())");
    expect(schema).toContain("reviewerDecision");
    expect(schema).toContain("gigaLearnAcademyAttempts: defineTable");
    expect(schema).toContain("gigaLearnAcademyCertificates: defineTable");
  });
});
