/** @vitest-environment edge-runtime */
/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, expect, it, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { createSessionToken } from "../../convex/sessionAuth";
import {
  getTechBankQuestionById,
  scoresAgainstPracticeKey,
} from "../../web/lib/gigalearn/academy/techBanks/techBankServer";

const modules = import.meta.glob("../../convex/**/*.*s");

afterEach(() => vi.unstubAllEnvs());

it.each<{
  courseSlug: string;
  topicId?: string;
  questionType: "mcq" | "true_false";
}>([
  { courseSlug: "exam-bece-prep", topicId: "integrated-science", questionType: "mcq" },
  { courseSlug: "exam-wassce-english", questionType: "mcq" },
  { courseSlug: "exam-ad-ii", questionType: "mcq" },
  { courseSlug: "exam-ad-ii", questionType: "true_false" },
])("preserves displayed choices and scores $courseSlug ($questionType) consistently", async ({ courseSlug, topicId, questionType }) => {
  vi.stubEnv("SESSION_SIGNING_SECRET", "gigalearn-exam-selection-test");
  const email = "gigalearn-exam-selection@example.com";
  const sessionToken = await createSessionToken(email);
  const t = convexTest(schema, modules);
  const now = Date.now();
  await t.run(async ({ db }) => {
    await db.insert("users", {
      email, tokens: 0, plan: "free", tier: "free", credits: 0, starterCreditsGranted: true,
      subscriptionPlan: "premium", subscriptionExpiresAt: now + 60_000,
    });
    await db.insert("gigaLearnAcademyEnrolments", {
      userId: email, courseSlug, status: "active", enrolledAt: now,
      progressPercent: 0, updatedAt: now,
    });
  });

  const practice = await t.mutation(api.gigaLearnTechBanks.startTechPracticeSession, {
    sessionToken, courseSlug, topicId, count: 10, mode: "learn", questionType,
  });
  const answerable = practice.questions.flatMap((displayed) => {
    expect(displayed).not.toHaveProperty("correctIndex");
    const original = getTechBankQuestionById(courseSlug, displayed.questionId);
    if (!original || !scoresAgainstPracticeKey(original)) return [];
    const displayedKey = displayed.options.indexOf(original.options[original.correctIndex]!);
    return displayedKey >= 0 ? [{ displayed, displayedKey, originalKey: original.correctIndex }] : [];
  });
  expect(answerable.length).toBeGreaterThanOrEqual(2);

  const session = { sessionToken, sessionId: practice.sessionId };
  const correct = answerable.find((answer) => answer.displayedKey !== answer.originalKey) ?? answerable[0]!;
  const wrong = answerable.find((answer) => answer !== correct)!;
  const wrongIndex = (wrong.displayedKey + 1) % wrong.displayed.options.length;
  const save = (questionId: string, selectedIndex: number) =>
    t.mutation(api.gigaLearnTechBanks.saveTechPracticeAnswer, { ...session, questionId, selectedIndex });

  const accepted = await save(correct.displayed.questionId, correct.displayedKey);
  expect(accepted.feedback).toMatchObject({
    correct: true, selectedIndex: correct.displayedKey, correctIndex: correct.displayedKey,
    explanation: expect.any(String),
  });
  const rejected = await save(wrong.displayed.questionId, wrongIndex);
  expect(rejected.feedback).toMatchObject({
    correct: false, selectedIndex: wrongIndex, correctIndex: wrong.displayedKey,
    explanation: expect.any(String),
  });
  const duplicate = await save(wrong.displayed.questionId, wrong.displayedKey);
  expect(duplicate.feedback).toEqual(rejected.feedback);

  const resumed = await t.query(api.gigaLearnTechBanks.getTechPracticeSession, session);
  expect(resumed?.answers).toMatchObject({
    [correct.displayed.questionId]: correct.displayedKey,
    [wrong.displayed.questionId]: wrongIndex,
  });
  expect(resumed?.questions).toEqual(practice.questions);

  const graded = await t.mutation(api.gigaLearnTechBanks.submitTechPracticeSession, session);
  expect(graded.score).toBe(1);
  expect(graded.results).toEqual(expect.arrayContaining([
    expect.objectContaining({ questionId: correct.displayed.questionId, selectedIndex: correct.displayedKey, correct: true }),
    expect.objectContaining({ questionId: wrong.displayed.questionId, selectedIndex: wrongIndex, correct: false }),
  ]));
  expect(await t.mutation(api.gigaLearnTechBanks.submitTechPracticeSession, session))
    .toMatchObject({ alreadyGraded: true, score: 1 });
});
