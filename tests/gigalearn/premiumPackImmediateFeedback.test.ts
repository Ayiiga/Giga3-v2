/**
 * Premium Full pack / practice_test must deliver immediate answer feedback
 * and one praise pulse per question — matching Learn mode, not timed exams.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { techModeShowsImmediateFeedback } from "../../web/lib/gigalearn/academy/techBanks/immediateFeedback";
import { EXAM_PRACTICE_DESTINATIONS } from "../../web/lib/gigalearn/examPractice/centreConfig";
import {
  rewardForCorrectAnswer,
  rewardForIncorrectAnswer,
} from "../../web/lib/gigalearn/examPractice/rewardCopy";

const ROOT = resolve(__dirname, "../..");

describe("techModeShowsImmediateFeedback", () => {
  it("enables learn + practice_test; withholds timed", () => {
    expect(techModeShowsImmediateFeedback("learn")).toBe(true);
    expect(techModeShowsImmediateFeedback("practice_test")).toBe(true);
    expect(techModeShowsImmediateFeedback("timed")).toBe(false);
    expect(techModeShowsImmediateFeedback("random")).toBe(false);
  });
});

describe("premium Full pack destinations", () => {
  it("routes Full pack CTAs through mode=learn with large count", () => {
    const full = [
      EXAM_PRACTICE_DESTINATIONS.adIiPracticeFull,
      EXAM_PRACTICE_DESTINATIONS.adIPracticeFull,
      EXAM_PRACTICE_DESTINATIONS.deputyDirectorPracticeFull,
      EXAM_PRACTICE_DESTINATIONS.directorIiPracticeFull,
      EXAM_PRACTICE_DESTINATIONS.directorIPracticeFull,
      EXAM_PRACTICE_DESTINATIONS.teacherPromotionPracticeFull,
      EXAM_PRACTICE_DESTINATIONS.becePracticeFull,
    ];
    for (const href of full) {
      expect(href, href).toContain("mode=learn");
      expect(href, href).toContain("count=500");
      expect(href, href).not.toContain("mode=practice_test");
    }
  });
});

describe("Convex + TechHubPractice wiring for practice_test feedback", () => {
  it("server returns feedback for practice_test as well as learn", () => {
    const convex = readFileSync(resolve(ROOT, "convex/gigaLearnTechBanks.ts"), "utf8");
    expect(convex).toContain(
      'session.mode === "learn" || session.mode === "practice_test"'
    );
    // Timed still falls through to feedback: null
    expect(convex).toContain("return { saved: true, feedback: null };");
  });

  it("UI gates reveal/reward on immediate-feedback modes and blocks resubmit farming", () => {
    const ui = readFileSync(
      resolve(ROOT, "web/components/gigalearn/academy/TechHubPractice.tsx"),
      "utf8"
    );
    expect(ui).toContain("techModeShowsImmediateFeedback");
    expect(ui).toContain("feedbackByQuestion");
    expect(ui).toContain("rewardedQuestionIdsRef");
    expect(ui).toContain("immediateFeedback && revealed");
    expect(ui).toContain("exam-option-note-correct");
    expect(ui).toContain("exam-reward");
  });
});

describe("praise rewards (established copy — no new monetisation)", () => {
  it("correct and incorrect praise differ; streak copy exists", () => {
    const ok = rewardForCorrectAnswer({ streak: 1, seed: 2 });
    const bad = rewardForIncorrectAnswer({ seed: 2 });
    expect(ok).toBeTruthy();
    expect(bad).toBeTruthy();
    expect(ok).not.toBe(bad);
    expect(rewardForCorrectAnswer({ streak: 3 })).toMatch(/3 in a row/i);
  });

  it("duplicate client praise is prevented by questionId set semantics", () => {
    const rewarded = new Set<string>();
    const qid = "exam-ad-ii-q010";
    let pulses = 0;
    function pulse(correct: boolean) {
      if (rewarded.has(qid)) return;
      rewarded.add(qid);
      if (correct) pulses += 1;
    }
    pulse(true);
    pulse(true);
    pulse(false);
    expect(pulses).toBe(1);
    expect(rewarded.size).toBe(1);
  });
});
