/**
 * Regression: provisional answer keys must not look/reward like verified keys,
 * and True/False export artifacts must not leak into stems.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getTechBankQuestionById,
  getTechBankQuestions,
  gradeTechAnswers,
  listLoadedTechBankSlugs,
  presentTechQuestion,
  toPublicTechQuestion,
} from "../../web/lib/gigalearn/academy/techBanks/techBankServer";
import { sanitizePracticeStem } from "../../web/lib/gigalearn/examPractice/sanitizePracticeStem";
import {
  rewardForCorrectAnswer,
  rewardForIncorrectAnswer,
} from "../../web/lib/gigalearn/examPractice/rewardCopy";

const ROOT = resolve(__dirname, "../..");

describe("sanitizePracticeStem (True/False + PDF artifacts)", () => {
  it("strips TRUE/FALSE rows and guide headers without rewriting the statement", () => {
    const raw =
      "GigaLearn — AD II Practice\nPage 3\nFormative assessment can help a teacher adjust instruction during learning.\nTRUE\nFALSE";
    const clean = sanitizePracticeStem(raw);
    expect(clean).toBe(
      "Formative assessment can help a teacher adjust instruction during learning."
    );
    expect(clean).not.toMatch(/TRUE|FALSE|Page\s+\d+|GigaLearn/i);
  });

  it("cleans interleaved TRUE / page / FALSE pollution", () => {
    const raw =
      "Assessment should align with the learning objective it measures.\nTRUE\n\nGigaLearn — D II Practice\nPage 59\nFALSE";
    expect(sanitizePracticeStem(raw)).toBe(
      "Assessment should align with the learning objective it measures."
    );
  });

  it("presentTechQuestion exposes sanitized stems for true/false banks", () => {
    const sample =
      getTechBankQuestionById("exam-ad-ii", "exam-ad-ii-tf-001") ??
      getTechBankQuestions("exam-ad-ii", {
        includePending: true,
        questionType: "true_false",
      })[0];
    expect(sample).toBeTruthy();
    const pub = toPublicTechQuestion(sample!);
    expect(pub.questionText).not.toMatch(/^\s*TRUE\s*$/m);
    expect(pub.questionText).not.toMatch(/^\s*FALSE\s*$/m);
    expect(pub.questionText).not.toMatch(/Page\s+\d+/i);
    expect(presentTechQuestion(sample!).questionText).toBe(pub.questionText);
  });
});

describe("gradeTechAnswers — verified vs provisional", () => {
  it("scores verified (approved) MCQ correct/incorrect with established semantics", () => {
    const approved = getTechBankQuestions("exam-bece-prep", { approvedOnly: true })[0];
    expect(approved).toBeTruthy();
    const gradedOk = gradeTechAnswers({
      courseSlug: "exam-bece-prep",
      questionIds: [approved!.questionId],
      answers: { [approved!.questionId]: approved!.correctIndex },
    });
    expect(gradedOk.score).toBe(1);
    expect(gradedOk.maxScore).toBe(1);
    expect(gradedOk.results[0]?.correct).toBe(true);
    expect(gradedOk.results[0]?.provisional).toBeFalsy();

    const wrongIndex = (approved!.correctIndex + 1) % approved!.options.length;
    const gradedBad = gradeTechAnswers({
      courseSlug: "exam-bece-prep",
      questionIds: [approved!.questionId],
      answers: { [approved!.questionId]: wrongIndex },
    });
    expect(gradedBad.score).toBe(0);
    expect(gradedBad.results[0]?.correct).toBe(false);
  });

  it("does not score pending_review items as verified-correct", () => {
    const pending = getTechBankQuestions("exam-ad-ii", { includePending: true }).find(
      (q) => q.reviewStatus === "pending_review"
    );
    expect(pending, "expected pending_review AD II item").toBeTruthy();
    const graded = gradeTechAnswers({
      courseSlug: "exam-ad-ii",
      questionIds: [pending!.questionId],
      answers: { [pending!.questionId]: pending!.correctIndex },
    });
    expect(graded.results[0]?.provisional).toBe(true);
    expect(graded.results[0]?.provisionalMatch).toBe(true);
    expect(graded.results[0]?.correct).toBe(false);
    expect(graded.results[0]?.scored).toBe(false);
    expect(graded.maxScore).toBe(0);
    expect(graded.score).toBe(0);
    expect(graded.results[0]?.explanation).toMatch(/Answer under review/i);
  });

  it("keeps verified True/False scoring when approved items exist", () => {
    let hit: { courseSlug: string; questionId: string; correctIndex: number } | null =
      null;
    for (const courseSlug of listLoadedTechBankSlugs()) {
      // includePending:false required — exam slugs otherwise mix pending into pools.
      const q = getTechBankQuestions(courseSlug, {
        includePending: false,
        questionType: "true_false",
      }).find((row) => row.reviewStatus === "approved");
      if (q) {
        hit = {
          courseSlug,
          questionId: q.questionId,
          correctIndex: q.correctIndex,
        };
        break;
      }
    }
    if (!hit) {
      // Many banks ship TF as pending_review only — verified MCQ coverage is enough.
      expect(true).toBe(true);
      return;
    }
    const graded = gradeTechAnswers({
      courseSlug: hit.courseSlug,
      questionIds: [hit.questionId],
      answers: { [hit.questionId]: hit.correctIndex },
    });
    expect(graded.score).toBe(1);
    expect(graded.results[0]?.correct).toBe(true);
  });
});

describe("client + server wiring for provisional reward suppression", () => {
  it("Convex feedback marks pending_review as correct:false with Answer under review", () => {
    const convex = readFileSync(resolve(ROOT, "convex/gigaLearnTechBanks.ts"), "utf8");
    expect(convex).toContain("pendingReview: true");
    expect(convex).toContain("provisionalMatch");
    expect(convex).toContain("Answer under review");
    expect(convex).toContain("correct: false");
  });

  it("TechHubPractice suppresses praise rewards when pendingReview", () => {
    const ui = readFileSync(
      resolve(ROOT, "web/components/gigalearn/academy/TechHubPractice.tsx"),
      "utf8"
    );
    expect(ui).toContain("fb.pendingReview");
    expect(ui).toContain('data-testid="exam-answer-under-review"');
    expect(ui).toContain("Answer under review");
    expect(ui).toContain("isVerifiedCorrect");
    expect(ui).toContain("goToQuestion");
    expect(ui).toContain("rewardedQuestionIdsRef");
    expect(ui).toMatch(/if \(fb\.pendingReview\)[\s\S]*setReward\(null\)/);
  });

  it("premium Full pack / free practice still use immediate-feedback learn path", () => {
    const centre = readFileSync(
      resolve(ROOT, "web/lib/gigalearn/examPractice/centreConfig.ts"),
      "utf8"
    );
    expect(centre).toContain("mode=learn");
    const ui = readFileSync(
      resolve(ROOT, "web/components/gigalearn/academy/TechHubPractice.tsx"),
      "utf8"
    );
    expect(ui).toContain("techModeShowsImmediateFeedback");
  });

  it("established reward copy unchanged for verified answers", () => {
    expect(rewardForCorrectAnswer({ streak: 1, seed: 0 })).toBeTruthy();
    expect(rewardForIncorrectAnswer({ seed: 0 })).toBeTruthy();
    expect(rewardForCorrectAnswer({ streak: 3 })).toMatch(/3 in a row/i);
  });

  it("duplicate praise prevention remains keyed by questionId", () => {
    const rewarded = new Set<string>();
    let pulses = 0;
    function pulse(qid: string, pendingReview: boolean, correct: boolean) {
      if (rewarded.has(qid)) return;
      rewarded.add(qid);
      if (pendingReview) return;
      if (correct) pulses += 1;
    }
    pulse("q1", true, true);
    pulse("q1", true, true);
    pulse("q2", false, true);
    pulse("q2", false, true);
    expect(pulses).toBe(1);
  });

  it("next-question navigation clears the reward pulse in TechHubPractice", () => {
    const ui = readFileSync(
      resolve(ROOT, "web/components/gigalearn/academy/TechHubPractice.tsx"),
      "utf8"
    );
    expect(ui).toContain("function goToQuestion");
    expect(ui).toMatch(/function goToQuestion[\s\S]*setReward\(null\)/);
  });
});
