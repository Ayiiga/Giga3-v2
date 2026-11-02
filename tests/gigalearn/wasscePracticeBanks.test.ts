import { describe, expect, it } from "vitest";
import { getExamBankMeta } from "../../web/lib/gigalearn/examPractice/examBankMeta";
import { getTechBankQuestions, listLoadedTechBankSlugs } from "../../web/lib/gigalearn/academy/techBanks/techBankServer";

const WASSCE_BANKS = [
  { slug: "exam-wassce-english", topic: "English Language", minimum: 200 },
  { slug: "exam-wassce-core-mathematics", topic: "Core Mathematics", minimum: 250 },
  { slug: "exam-wassce-integrated-science", topic: "Integrated Science", minimum: 250 },
  { slug: "exam-wassce-social-studies", topic: "Social Studies", minimum: 250 },
] as const;

describe("WASSCE four-core-subject practice banks", () => {
  it("loads only the four requested WASSCE core subjects", () => {
    const loaded = listLoadedTechBankSlugs();
    for (const bank of WASSCE_BANKS) expect(loaded).toContain(bank.slug);
  });

  it("keeps every selected WASSCE subject session strictly inside its own bank", () => {
    for (const selected of WASSCE_BANKS) {
      const questions = getTechBankQuestions(selected.slug, { approvedOnly: false });
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.every((question) => question.courseSlug === selected.slug)).toBe(true);
      expect(
        questions.every((question) => question.questionId.startsWith(`${selected.slug}-q`))
      ).toBe(true);
    }
  });

  for (const bank of WASSCE_BANKS) {
    it(`makes ${bank.topic} objective practice available with honest review status`, () => {
      const meta = getExamBankMeta(bank.slug);
      const questions = getTechBankQuestions(bank.slug);
      expect(meta).toBeTruthy();
      expect(questions.length).toBeGreaterThanOrEqual(bank.minimum);
      expect(questions.every((q) => q.reviewStatus === "pending_review")).toBe(true);
      expect(questions.every((q) => q.questionType === "mcq")).toBe(true);
      for (const q of questions) {
        expect(q.options).toHaveLength(4);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(4);
        expect(q.questionText.trim().length).toBeGreaterThan(10);
        expect(q.explanation.trim().length).toBeGreaterThan(5);
        expect(q.sourceType).toBe("original_practice");
        expect(q.verificationStatus).toBe("awaiting_verification");
      }
    });
  }
});
