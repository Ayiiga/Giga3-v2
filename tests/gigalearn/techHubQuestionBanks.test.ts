import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getTechBankQuestions,
  gradeTechAnswers,
  selectTechQuestionIds,
  toPublicTechQuestion,
} from "../../web/lib/gigalearn/academy/techBanks/techBankServer";
import {
  getTechCourseMeta,
  listTechCourseMeta,
  TECH_HUB_COURSE_SLUGS,
} from "../../web/lib/gigalearn/academy/techBanks/techBankMeta";
import { getBuiltinAcademyCourse, listBuiltinAcademyCourses } from "../../web/lib/gigalearn/academy/courseCatalog";

const ROOT = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

describe("Technology Learning Hub question banks", () => {
  it("publishes five Technology catalogue courses with varied difficulty", () => {
    const tech = listBuiltinAcademyCourses().filter((c) => c.category === "Technology");
    expect(tech.map((c) => c.slug).sort()).toEqual([...TECH_HUB_COURSE_SLUGS].sort());
    const difficulties = new Set(tech.map((c) => c.difficulty));
    expect(difficulties.has("beginner")).toBe(true);
    expect(difficulties.has("intermediate")).toBe(true);
    expect(difficulties.has("advanced")).toBe(false);
    for (const slug of TECH_HUB_COURSE_SLUGS) {
      expect(getBuiltinAcademyCourse(slug)?.learningObjectives.length).toBeGreaterThan(0);
    }
  });

  it("import report does not claim 2500 imported and notes missing PDFs", () => {
    const report = JSON.parse(
      read("web/lib/gigalearn/academy/techBanks/import-report.json")
    ) as {
      missingSources: unknown[];
      totals: {
        extracted: number;
        uniqueImportable: number;
        approvedImported: number;
        claimedAs2500: boolean;
      };
      banks: Array<{
        sourceFile: string;
        extracted: number;
        uniqueImportable: number;
        nearDuplicates: number;
        topicCount: number;
      }>;
    };
    expect(report.totals.claimedAs2500).toBe(false);
    expect(report.missingSources).toHaveLength(2);
    expect(report.totals.extracted).toBe(1500);
    expect(report.totals.approvedImported).toBe(report.totals.uniqueImportable);
    expect(report.totals.approvedImported).toBeLessThan(1500);
    expect(report.banks).toHaveLength(3);
    for (const bank of report.banks) {
      expect(bank.extracted).toBe(500);
      expect(bank.topicCount).toBeGreaterThanOrEqual(20);
      expect(bank.nearDuplicates).toBeGreaterThan(0);
      expect(bank.uniqueImportable).toBeLessThan(500);
    }
  });

  it("each loaded bank has approved MCQs with four options and a valid key", () => {
    for (const slug of ["website-pwa-development", "robotics-intelligent-systems", "other-digital-technologies"]) {
      const qs = getTechBankQuestions(slug, { approvedOnly: true });
      expect(qs.length).toBeGreaterThan(200);
      expect(qs.length).toBe(getTechCourseMeta(slug)?.approvedQuestionCount);
      for (const q of qs.slice(0, 40)) {
        expect(q.options).toHaveLength(4);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(4);
        expect(q.explanation.length).toBeGreaterThan(5);
        expect(q.reviewStatus).toBe("approved");
        const pub = toPublicTechQuestion(q);
        expect(pub).not.toHaveProperty("correctIndex");
        expect(JSON.stringify(pub)).not.toContain('"correctIndex"');
      }
    }
  });

  it("AI and Mobile courses await materials without inventing banks", () => {
    expect(getTechCourseMeta("ai-machine-learning")?.awaitingMaterials).toBe(true);
    expect(getTechCourseMeta("mobile-app-development")?.awaitingMaterials).toBe(true);
    expect(getTechBankQuestions("ai-machine-learning")).toHaveLength(0);
    expect(existsSync(resolve(ROOT, "web/lib/gigalearn/academy/techBanks/ai-ml.json"))).toBe(
      false
    );
  });

  it("selects shuffled sets without dropping answer-key integrity", () => {
    const ids = selectTechQuestionIds({
      courseSlug: "website-pwa-development",
      mode: "random",
      count: 10,
      seed: 42,
    });
    expect(ids).toHaveLength(10);
    const ids2 = selectTechQuestionIds({
      courseSlug: "website-pwa-development",
      mode: "random",
      count: 10,
      seed: 42,
    });
    expect(ids2).toEqual(ids);
    const graded = gradeTechAnswers({
      courseSlug: "website-pwa-development",
      questionIds: ids,
      answers: Object.fromEntries(
        ids.map((id) => {
          const q = getTechBankQuestions("website-pwa-development").find(
            (row) => row.questionId === id
          )!;
          return [id, q.correctIndex];
        })
      ),
    });
    expect(graded.score).toBe(graded.maxScore);
    expect(graded.percent).toBe(100);
  });

  it("wires Convex tech bank module and session schema", () => {
    const schema = read("convex/schema.ts");
    expect(schema).toContain("gigaLearnTechSessions");
    expect(schema).toContain('v.literal("timed")');
    const convex = read("convex/gigaLearnTechBanks.ts");
    expect(convex).toContain("requireSession(args.sessionToken, ctx)");
    expect(convex).toContain("endsAt");
    expect(convex).toContain("toPublicTechQuestion");
    const startBlock = convex.slice(
      convex.indexOf("export const startTechPracticeSession"),
      convex.indexOf("export const getTechPracticeSession")
    );
    expect(startBlock).toContain("toPublicTechQuestion");
    expect(startBlock).not.toContain("correctIndex:");
    expect(read("web/components/gigalearn/academy/TechHubPractice.tsx")).toContain(
      "startTechPracticeSession"
    );
    expect(read("web/app/(marketing)/gigalearn/academy/tech/page.tsx")).toContain(
      "Technology Learning Hub"
    );
  });

  it("meta lists all five courses for catalogue badges", () => {
    expect(listTechCourseMeta()).toHaveLength(5);
    expect(
      listTechCourseMeta().reduce((n, c) => n + c.approvedQuestionCount, 0)
    ).toBe(819);
  });
});
