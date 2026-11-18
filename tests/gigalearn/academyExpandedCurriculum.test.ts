import { describe, expect, it } from "vitest";
import courses from "../../web/public/gigalearn/academy/workspace/courses.mjs";
import { eligibleForCertificate, passingScore, readProgress } from "../../web/public/gigalearn/academy/workspace/progress.mjs";

describe("expanded Academy curriculum", () => {
  it("provides ten distinct lessons and ten valid assessment questions per track", () => {
    expect(courses).toHaveLength(6);
    for (const course of courses) {
      expect(course.lessons).toHaveLength(10);
      expect(new Set(course.lessons.map(([title]) => title)).size).toBe(10);
      expect(course.quiz).toHaveLength(10);
      expect(passingScore(course)).toBe(8);
      for (const [, options, answer, explanation] of course.quiz) {
        expect(options[Number(answer)]).toBeTruthy();
        expect(explanation).toBeTruthy();
      }
    }
  });

  it("carries forward completed lessons and original certificates separately", () => {
    const course = courses[0];
    const earned = "2026-11-10T03:22:00.000Z";
    const migrated = readProgress(course, { done: [0, 1, 2], best: 4, earned });
    expect(migrated).toMatchObject({
      done: [0, 1, 2], introductoryBest: 4, introductoryEarned: earned, best: 0, earned: "",
    });
    expect(readProgress(course, migrated)).toEqual(migrated);
    expect(eligibleForCertificate(course, migrated)).toBe(false);
    const done = course.lessons.map((_, i) => i);
    expect(eligibleForCertificate(course, { ...migrated, done, best: 7 })).toBe(false);
    expect(eligibleForCertificate(course, { ...migrated, done: done.slice(1), best: 8 })).toBe(false);
    expect(eligibleForCertificate(course, { ...migrated, done, best: 8 })).toBe(true);
  });
});

it("unlocks lessons in sequence while keeping previously completed lessons reviewable", async () => {
  const { lessonUnlocked, lessonsComplete } = await import("../../web/public/gigalearn/academy/workspace/progress.mjs");
  const course = courses[1];
  const state = readProgress(course, { done: [0, 3] });
  expect([0, 1, 2, 3, 4].map((index) => lessonUnlocked(state, index))).toEqual([true, true, false, true, false]);
  expect(lessonsComplete(course, state)).toBe(false);
  state.done.push(1, 2);
  expect(lessonUnlocked(state, 4)).toBe(true);
});

it("validates and preserves named certificate records across reloads", async () => {
  const { createCertificateSerial } = await import("../../web/public/gigalearn/academy/workspace/progress.mjs");
  const serial = createCertificateSerial("ai");
  expect(serial).toMatch(/^GLA-AI-[A-F0-9]{24}$/);
  expect(createCertificateSerial("ai")).not.toBe(serial);
  const course = courses[1];
  const certificate = readProgress(course, { revision: 2, recipient: "  Ama Asare  ", serial });
  expect(certificate).toMatchObject({ recipient: "Ama Asare", serial });
  expect(readProgress(course, certificate)).toEqual(certificate);
});
