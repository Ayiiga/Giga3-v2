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
import { getExamBankMeta } from "../../web/lib/gigalearn/examPractice/examBankMeta";
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

  it("import report does not claim 2500 imported and notes missing Mobile PDF", () => {
    const report = JSON.parse(
      read("web/lib/gigalearn/academy/techBanks/import-report.json")
    ) as {
      missingSources: unknown[];
      totals: {
        techExtracted: number;
        techUniqueApproved: number;
        claimedAs2500Tech: boolean;
      };
      techBanks: Array<{
        sourceFile: string;
        extracted: number;
        uniqueImportable: number;
        approvedImported: number;
        topicCount: number;
      }>;
    };
    expect(report.totals.claimedAs2500Tech).toBe(false);
    expect(report.missingSources).toHaveLength(1);
    expect(report.totals.techExtracted).toBe(2000);
    expect(report.totals.techUniqueApproved).toBe(1092);
    expect(report.techBanks).toHaveLength(4);
    for (const bank of report.techBanks) {
      expect(bank.extracted).toBe(500);
      expect(bank.topicCount).toBeGreaterThanOrEqual(20);
      expect(bank.uniqueImportable).toBeLessThan(500);
      expect(bank.approvedImported).toBe(bank.uniqueImportable);
    }
  });

  it("each loaded tech bank has approved MCQs with four options and a valid key", () => {
    for (const slug of [
      "website-pwa-development",
      "robotics-intelligent-systems",
      "other-digital-technologies",
      "ai-machine-learning",
    ]) {
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

  it("Mobile awaits materials; AI bank is imported", () => {
    expect(getTechCourseMeta("ai-machine-learning")?.awaitingMaterials).toBe(false);
    expect(getTechCourseMeta("mobile-app-development")?.awaitingMaterials).toBe(true);
    expect(getTechBankQuestions("ai-machine-learning").length).toBeGreaterThan(200);
    expect(existsSync(resolve(ROOT, "web/lib/gigalearn/academy/techBanks/ai-ml.json"))).toBe(
      true
    );
    expect(getTechBankQuestions("mobile-app-development")).toHaveLength(0);
  });

  it("wires BECE and Teacher Promotion exam banks into shared practice loader", () => {
    const beceMeta = getExamBankMeta("exam-bece-prep");
    const teacherMeta = getExamBankMeta("exam-teacher-promotion");
    const ad2Meta = getExamBankMeta("exam-ad2-study-guide");
    expect(beceMeta?.approvedQuestionCount).toBe(468);
    expect(teacherMeta?.approvedQuestionCount).toBe(60);
    expect(teacherMeta?.pendingQuestionCount).toBe(179);
    expect(ad2Meta?.approvedQuestionCount).toBe(0);

    const bece = getTechBankQuestions("exam-bece-prep");
    expect(bece.length).toBe(468);
    expect(getTechCourseMeta("exam-bece-prep")?.awaitingMaterials).toBe(false);

    const teacher = getTechBankQuestions("exam-teacher-promotion");
    expect(teacher.length).toBe(239);
    expect(teacher.filter((q) => q.reviewStatus === "pending_review").length).toBe(179);

    const provisional = teacher.find((q) => q.reviewStatus === "pending_review")!;
    const graded = gradeTechAnswers({
      courseSlug: "exam-teacher-promotion",
      questionIds: [provisional.questionId],
      answers: { [provisional.questionId]: provisional.correctIndex },
    });
    expect(graded.score).toBe(1);
    expect(graded.results[0]?.provisional).toBe(true);

    expect(getBuiltinAcademyCourse("exam-bece-prep")?.category).toBe("Exam prep");
    expect(getBuiltinAcademyCourse("exam-teacher-promotion")?.category).toBe("Exam prep");
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
    ).toBe(1092);
  });
});
