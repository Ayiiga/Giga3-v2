/**
 * Exam Practice Centre Phase B — landing, BECE empty state, promotion entry, destinations.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BECE_AWAITING_MATERIALS_MESSAGE,
  BECE_BANK_SUMMARY,
  BECE_SUBJECTS_AVAILABLE,
  EXAM_PRACTICE_CENTRE_TAGLINE,
  EXAM_PRACTICE_CENTRE_TITLE,
  EXAM_PRACTICE_DESTINATIONS,
  TEACHER_PROMOTION_BANK_SUMMARY,
  TEACHER_PROMOTION_LEVEL_LABELS,
  TEACHER_PROMOTION_SOURCE_INVENTORY,
  answerStatusLabel,
} from "../../web/lib/gigalearn/examPractice/centreConfig";

const ROOT = resolve(__dirname, "../..");

describe("Exam Practice Centre Phase B", () => {
  it("ships title, tagline, and imported BECE subjects with honest counts", () => {
    expect(EXAM_PRACTICE_CENTRE_TITLE).toBe("GigaLearn Exam Practice Centre");
    expect(EXAM_PRACTICE_CENTRE_TAGLINE).toContain("Practise smarter");
    expect(BECE_AWAITING_MATERIALS_MESSAGE).toBe(
      "BECE practice materials are being prepared."
    );
    expect(BECE_BANK_SUMMARY.available).toBe(true);
    expect(BECE_BANK_SUMMARY.approvedCount).toBe(468);
    expect(BECE_SUBJECTS_AVAILABLE.length).toBeGreaterThanOrEqual(8);
    expect(BECE_SUBJECTS_AVAILABLE.some((s) => s.id === "mathematics")).toBe(true);
  });

  it("lists teacher-promotion levels and source inventory without claiming verified keys", () => {
    expect(TEACHER_PROMOTION_LEVEL_LABELS.map((l) => l.id)).toEqual([
      "deputy-director",
      "assistant-director-i",
      "assistant-director-ii",
      "principal-superintendent",
    ]);
    expect(TEACHER_PROMOTION_SOURCE_INVENTORY.length).toBeGreaterThanOrEqual(4);
    expect(TEACHER_PROMOTION_BANK_SUMMARY.available).toBe(true);
    expect(TEACHER_PROMOTION_BANK_SUMMARY.approvedCount).toBe(60);
    expect(TEACHER_PROMOTION_BANK_SUMMARY.pendingCount).toBe(179);
    for (const src of TEACHER_PROMOTION_SOURCE_INVENTORY) {
      expect(src.answerStatus).not.toBe("verified");
      expect(answerStatusLabel(src.answerStatus).toLowerCase()).toMatch(
        /review|verification/
      );
    }
  });

  it("deep-links only to verified existing GigaLearn destinations", () => {
    expect(EXAM_PRACTICE_DESTINATIONS.aiTutor).toBe("/gigalearn/?tab=tutor");
    expect(EXAM_PRACTICE_DESTINATIONS.studentLearn).toBe("/gigalearn/?tab=learn");
    expect(EXAM_PRACTICE_DESTINATIONS.teacherHub).toBe(
      "/gigalearn/?tab=teacher&intent=promotion-practice"
    );
    expect(EXAM_PRACTICE_DESTINATIONS.academy).toBe("/gigalearn/academy/");
    expect(EXAM_PRACTICE_DESTINATIONS.academyAssess).toBe("/gigalearn/academy/assess/");
    expect(EXAM_PRACTICE_DESTINATIONS.revision).toBe("/gigalearn/?tab=revision");
    expect(EXAM_PRACTICE_DESTINATIONS.becePractice).toContain("exam-bece-prep");
    expect(EXAM_PRACTICE_DESTINATIONS.teacherPromotionPractice).toContain(
      "exam-teacher-promotion"
    );
  });

  it("renders BECE ready state and separate teacher-promotion centre in UI", () => {
    const ui = readFileSync(
      resolve(ROOT, "web/components/gigalearn/exam/ExamPracticeCentre.tsx"),
      "utf8"
    );
    expect(ui).toContain("BECE Mock Examination Centre");
    expect(ui).toContain('data-testid="bece-practice-ready"');
    expect(ui).toContain("BECE_AWAITING_MATERIALS_MESSAGE");
    expect(ui).toContain("Ghana Teacher Promotion Practice");
    expect(ui).toContain('data-testid="teacher-promotion-centre"');
    expect(ui).toContain('data-testid="teacher-promotion-bank-ready"');
    expect(ui).toContain('data-testid="ai-study-tutor"');
    expect(ui).toContain('data-testid="my-performance"');
    expect(ui).toContain("listProgress");
    expect(ui).toContain("listMyEnrolments");
    expect(ui).toContain("listMyAssessmentHistory");
    expect(ui).toContain("ProductSignInPrompt");
    expect(ui).toContain("AI-generated practice");
    expect(ui).not.toContain("localStorage.setItem");
    // Must not dump promotion sources into BECE card.
    const beceBlock = ui.slice(
      ui.indexOf("function BeceCentreCard"),
      ui.indexOf("function TeacherPromotionCentreCard")
    );
    expect(beceBlock).not.toContain("TEACHER_PROMOTION_SOURCE_INVENTORY");
    expect(beceBlock).not.toContain("Benito");
  });

  it("adds exam route and preserves Academy routes in nav", () => {
    expect(existsSync(resolve(ROOT, "web/app/(marketing)/gigalearn/exam/page.tsx"))).toBe(
      true
    );
    expect(
      existsSync(resolve(ROOT, "web/app/(marketing)/gigalearn/academy/page.tsx"))
    ).toBe(true);
    expect(
      existsSync(resolve(ROOT, "web/app/(marketing)/gigalearn/academy/my/page.tsx"))
    ).toBe(true);
    expect(
      existsSync(resolve(ROOT, "web/app/(marketing)/gigalearn/academy/assess/page.tsx"))
    ).toBe(true);
    expect(
      existsSync(resolve(ROOT, "web/app/(marketing)/gigalearn/academy/certificates/page.tsx"))
    ).toBe(true);
    expect(
      existsSync(resolve(ROOT, "web/app/(marketing)/gigalearn/academy/verify/page.tsx"))
    ).toBe(true);
    expect(
      existsSync(resolve(ROOT, "web/app/(marketing)/gigalearn/academy/author/page.tsx"))
    ).toBe(true);

    const chrome = readFileSync(
      resolve(ROOT, "web/components/gigalearn/academy/AcademyChrome.tsx"),
      "utf8"
    );
    expect(chrome).toContain("/gigalearn/exam/");
    expect(chrome).toContain("/gigalearn/academy/");
    expect(chrome).toContain("/gigalearn/academy/my/");
    expect(chrome).toContain("/gigalearn/academy/certificates/");
    expect(chrome).toContain("/gigalearn/academy/verify/");
    expect(chrome).toContain("/gigalearn/academy/author/");

    const site = readFileSync(resolve(ROOT, "web/lib/site.ts"), "utf8");
    expect(site).toContain('gigalearnExam: "/gigalearn/exam"');

    const sitemap = readFileSync(resolve(ROOT, "web/public/sitemap-gigalearn.xml"), "utf8");
    expect(sitemap).toContain("/gigalearn/exam/");
    expect(sitemap).toContain("/gigalearn/exam/practice/");

    const client = readFileSync(
      resolve(ROOT, "web/components/gigalearn/GigaLearnClient.tsx"),
      "utf8"
    );
    expect(client).toContain("/gigalearn/exam/");
  });

  it("uses mobile-first touch targets and does not invent score copy", () => {
    const ui = readFileSync(
      resolve(ROOT, "web/components/gigalearn/exam/ExamPracticeCentre.tsx"),
      "utf8"
    );
    expect(ui).toContain("min-h-11");
    expect(ui).toMatch(/sm:flex-row|sm:grid-cols/);
    expect(ui).not.toMatch(/achievement unlocked|100% complete/i);
    expect(ui).toMatch(/invent(?:ed)? scores/i);
  });
});
