/** Regression guards for the learner's tapped display option and server grading map. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  displayCorrectIndex,
  toOriginalOptionIndex,
} from "../../web/lib/gigalearn/examPractice/optionShuffle";

describe("GigaLearn immediate selection reliability", () => {
  const component = readFileSync(resolve(__dirname, "../../web/components/gigalearn/academy/TechHubPractice.tsx"), "utf8");

  it("highlights the tapped index before awaiting the server, and restores it on failed saves", () => {
    const handler = component.slice(
      component.indexOf("async function onSubmitAnswer("),
      component.indexOf("async function onSubmitTextAnswer(")
    );
    expect(handler).toContain("savingAnswerRef.current = true");
    expect(handler).toContain("if (!sessionToken || !sessionId || !current || savingAnswerRef.current) return;");
    const optimistic = handler.indexOf("setAnswers((prev) => ({ ...prev, [questionId]: selectedIndex }))");
    const request = handler.indexOf("const res = await saveAnswer(");
    expect(optimistic).toBeGreaterThan(0);
    expect(optimistic).toBeLessThan(request);
    expect(handler).toContain("selectedIndex,");
    expect(handler).toContain("const savedIndex =");
    expect(handler).toContain("[questionId]: savedIndex");
    expect(handler).toContain("if (previousAnswer === undefined) delete next[questionId]");
    expect(handler).toContain("savingAnswerRef.current = false");
  });

  it("does not bypass the save guard or navigate away while an answer is pending", () => {
    const clickHandler = component.slice(
      component.indexOf("onClick={() => {", component.indexOf("current.options.map((opt, optIndex) => {")),
      component.indexOf('className={cn(', component.indexOf("current.options.map((opt, optIndex) => {"))
    );
    // All modes call the guarded handler; the click path must not independently highlight an unsaved answer.
    expect(clickHandler).not.toContain("[current.questionId]: optIndex");
    expect(clickHandler).toContain("savingAnswerRef.current");
    const navigation = component.slice(
      component.indexOf("function goToQuestion("),
      component.indexOf("async function onFinish(")
    );
    expect(navigation).toContain("if (savingAnswerRef.current || busy) return;");
    expect(component).toContain("disabled={index === 0 || busy}");
    expect(component).toContain("disabled={busy || (immediateFeedback && !revealed)}");
  });

  it("maps every displayed answer index to the intended original answer for 2- and 4-choice questions", () => {
    for (const permutation of [[1, 0], [2, 0, 3, 1], [3, 2, 1, 0], [0, 1, 2, 3]]) {
      for (let originalCorrect = 0; originalCorrect < permutation.length; originalCorrect++) {
        const displayedCorrect = displayCorrectIndex(originalCorrect, permutation);
        expect(toOriginalOptionIndex(displayedCorrect, permutation)).toBe(originalCorrect);
        for (let tapped = 0; tapped < permutation.length; tapped++) {
          expect(toOriginalOptionIndex(tapped, permutation) === originalCorrect).toBe(tapped === displayedCorrect);
        }
      }
    }
  });
});
