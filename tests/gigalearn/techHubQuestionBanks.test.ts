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

  it("import report does not claim 2500/500 unique and notes missing Mobile PDF", () => {
    const report = JSON.parse(
      read("web/lib/gigalearn/academy/techBanks/import-report.json")
    ) as {
      missingSources: Array<{
        file: string;
        courseSlug: string;
        expectedRepoImportPath?: string;
        status?: string;
      }>;
      totals: {
        techExtracted: number;
        techUniqueApproved: number;
        claimedAs2500Tech: boolean;
        aiExtracted: number;
        aiNearDuplicatesRemoved: number;
        aiUniqueApproved: number;
        aiRejected: number;
        claimedAs500AiUnique: boolean;
        examApproved: number;
        examPendingReview: number;
      };
      techBanks: Array<{
        bankId: string;
        sourceFile: string;
        extracted: number;
        uniqueImportable: number;
        approvedImported: number;
        topicCount: number;
        nearDuplicates?: number;
        claimedAs500Unique?: boolean;
      }>;
      examBanks: Array<{
        sourceFile: string;
        approvedImported: number;
        pendingImported: number;
        claimedAsOfficialWaec?: boolean;
        claimedAsOfficialGes?: boolean;
        sourceKind?: string;
      }>;
    };
    expect(report.totals.claimedAs2500Tech).toBe(false);
    expect(report.totals.claimedAs500AiUnique).toBe(false);
    expect(report.missingSources).toHaveLength(1);
    expect(report.missingSources[0]?.courseSlug).toBe("mobile-app-development");
    expect(report.missingSources[0]?.status).toBe("not_uploaded");
    expect(report.missingSources[0]?.expectedRepoImportPath).toContain("mobile-app.json");
    expect(report.totals.techExtracted).toBe(2000);
    expect(report.totals.techUniqueApproved).toBe(1092);
    expect(report.totals.aiExtracted).toBe(500);
    expect(report.totals.aiNearDuplicatesRemoved).toBe(227);
    expect(report.totals.aiUniqueApproved).toBe(273);
    expect(report.totals.aiRejected).toBe(0);
    expect(report.techBanks).toHaveLength(4);
    const ai = report.techBanks.find((b) => b.bankId === "ai-ml");
    expect(ai?.nearDuplicates).toBe(227);
    expect(ai?.claimedAs500Unique).toBe(false);
    for (const bank of report.techBanks) {
      expect(bank.extracted).toBe(500);
      expect(bank.topicCount).toBeGreaterThanOrEqual(20);
      expect(bank.uniqueImportable).toBeLessThan(500);
      expect(bank.approvedImported).toBe(bank.uniqueImportable);
    }
    const bece = report.examBanks.find((b) => b.sourceFile.includes("BECE"));
    const teacher = report.examBanks.find((b) => b.sourceFile.includes("Teachers_Promotion"));
    expect(bece?.approvedImported).toBe(468);
    expect(bece?.claimedAsOfficialWaec).toBe(false);
    expect(bece?.sourceKind).toBe("authored_practice");
    expect(teacher?.approvedImported).toBe(238);
    expect(teacher?.pendingImported).toBe(1);
    expect(teacher?.claimedAsOfficialGes).toBe(false);
    expect(report.totals.examApproved).toBe(706);
    expect(report.totals.examPendingReview).toBe(1);
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
    expect(teacherMeta?.approvedQuestionCount).toBe(238);
    expect(teacherMeta?.pendingQuestionCount).toBe(1);
    expect(ad2Meta?.approvedQuestionCount).toBe(0);

    const bece = getTechBankQuestions("exam-bece-prep");
    expect(bece.length).toBe(468);
    expect(getTechCourseMeta("exam-bece-prep")?.awaitingMaterials).toBe(false);
    expect(new Set(bece.map((q) => q.topicId)).size).toBe(10);

    const teacher = getTechBankQuestions("exam-teacher-promotion");
    expect(teacher.length).toBe(239);
    expect(teacher.filter((q) => q.reviewStatus === "pending_review").length).toBe(1);

    const provisional = teacher.find((q) => q.reviewStatus === "pending_review")!;
    const graded = gradeTechAnswers({
      courseSlug: "exam-teacher-promotion",
      questionIds: [provisional.questionId],
      answers: { [provisional.questionId]: provisional.correctIndex },
    });
    expect(graded.score).toBe(1);
    expect(graded.results[0]?.provisional).toBe(true);

    // Answer keys stripped from public shape for exam banks too.
    const pubBece = toPublicTechQuestion(bece[0]!);
    expect(pubBece).not.toHaveProperty("correctIndex");
    expect(pubBece).not.toHaveProperty("explanation");
    const wrong = gradeTechAnswers({
      courseSlug: "exam-bece-prep",
      questionIds: [bece[0]!.questionId],
      answers: { [bece[0]!.questionId]: (bece[0]!.correctIndex + 1) % 4 },
    });
    expect(wrong.score).toBe(0);
    expect(wrong.results[0]?.correct).toBe(false);

    expect(getBuiltinAcademyCourse("exam-bece-prep")?.category).toBe("Exam prep");
    expect(getBuiltinAcademyCourse("exam-teacher-promotion")?.category).toBe("Exam prep");
    expect(getBuiltinAcademyCourse("exam-bece-prep")?.description).toMatch(/practice|not.*official|WAEC/i);
  });

  it("allows exam packs up to 500 while tech hub stays at 50", () => {
    const examIds = selectTechQuestionIds({
      courseSlug: "exam-bece-prep",
      mode: "practice_test",
      count: 500,
      seed: 7,
    });
    expect(examIds.length).toBeGreaterThan(50);
    expect(examIds.length).toBeLessThanOrEqual(500);
    const techIds = selectTechQuestionIds({
      courseSlug: "website-pwa-development",
      mode: "random",
      count: 500,
      seed: 7,
    });
    expect(techIds.length).toBeLessThanOrEqual(50);
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
    expect(convex).toContain("requireActiveEnrolment");
    expect(convex).toContain("endsAt");
    expect(convex).toContain("presentTechQuestion");
    expect(convex).toContain("buildSessionOptionPermutations");
    expect(convex).toContain("optionPermutationsJson");
    expect(convex).toContain("saveTechPracticeAnswer");
    expect(convex).toContain("submitTechPracticeSession");
    const startBlock = convex.slice(
      convex.indexOf("export const startTechPracticeSession"),
      convex.indexOf("export const getTechPracticeSession")
    );
    expect(startBlock).toContain("presentTechQuestion");
    expect(startBlock).toContain("optionPermutationsJson");
    expect(startBlock).not.toContain("correctIndex:");
    // In-progress session query must not leak keys; learn-mode feedback is gated.
    const getBlock = convex.slice(
      convex.indexOf("export const getTechPracticeSession"),
      convex.indexOf("export const saveTechPracticeAnswer")
    );
    expect(getBlock).toContain("presentTechQuestion");
    expect(getBlock).not.toContain("correctIndex:");
    expect(getBlock).toContain('session.status === "graded"');
    const saveBlock = convex.slice(
      convex.indexOf("export const saveTechPracticeAnswer"),
      convex.indexOf("export const submitTechPracticeSession")
    );
    expect(saveBlock).toContain('session.mode === "learn"');
    expect(saveBlock).toContain("feedback: null");
    expect(read("web/components/gigalearn/academy/TechHubPractice.tsx")).toContain(
      "startTechPracticeSession"
    );
    expect(read("web/app/(marketing)/gigalearn/academy/tech/page.tsx")).toContain(
      "Technology Learning Hub"
    );
    // Mobile pipeline stays ready: extract script keeps awaitingMaterials until JSON exists.
    const extract = read("scripts/extract-question-banks.py");
    expect(extract).toContain("mobile-app-development");
    expect(extract).toContain("awaitingMaterials");
    expect(existsSync(resolve(ROOT, "web/lib/gigalearn/academy/techBanks/mobile-app.json"))).toBe(
      false
    );
  });

  it("meta lists all five courses for catalogue badges", () => {
    expect(listTechCourseMeta()).toHaveLength(5);
    expect(
      listTechCourseMeta().reduce((n, c) => n + c.approvedQuestionCount, 0)
    ).toBe(1092);
  });
});
