import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const BANKS = [
  "ad-ii.json",
  "ad-i.json",
  "deputy-director.json",
  "director-ii.json",
  "director-i.json",
] as const;

describe("Teacher Promotion bank expansion quality", () => {
  for (const file of BANKS) {
    it(`${file} has 550 published items without case labels or empty option notes`, () => {
      const raw = readFileSync(
        resolve(ROOT, `web/lib/gigalearn/examPractice/banks/${file}`),
        "utf8"
      );
      const data = JSON.parse(raw) as {
        questions: Array<{
          questionId: string;
          questionText: string;
          options: string[];
          correctIndex: number;
          explanation: string;
          optionExplanations?: string[];
          publicationStatus?: string;
          reviewStatus?: string;
        }>;
      };
      expect(data.questions).toHaveLength(550);
      const stems = new Set<string>();
      for (const q of data.questions) {
        expect(q.publicationStatus).toBe("published_practice");
        expect(["approved", "pending_review"]).toContain(q.reviewStatus);
        expect(q.questionText).not.toMatch(/\(case\s+/i);
        expect(q.questionText).not.toMatch(/which approach should be preferred/i);
        expect(q.explanation.trim().length).toBeGreaterThan(40);
        expect(q.optionExplanations?.length).toBe(q.options.length);
        for (const note of q.optionExplanations ?? []) {
          expect(note.trim().length).toBeGreaterThan(20);
          expect(note.toLowerCase()).not.toContain("does not satisfy the question");
        }
        const key = q.questionText.replace(/\s+/g, " ").trim().toLowerCase();
        expect(stems.has(key)).toBe(false);
        stems.add(key);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(q.options.length);
      }
      expect(stems.size).toBe(550);
    });
  }
});
