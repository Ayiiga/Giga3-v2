import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EXAM_PRACTICE_DESTINATIONS,
  PROMOTION_RANK_BANK_SUMMARIES,
  PROMOTION_RANK_BANKS_TOTAL,
  PROMOTION_RANK_TARGET_COUNT,
} from "../../web/lib/gigalearn/examPractice/centreConfig";
import { getExamBankMeta } from "../../web/lib/gigalearn/examPractice/examBankMeta";

const ROOT = resolve(__dirname, "../..");

describe("Teacher Promotion rank selector", () => {
  it("routes Teacher Promotion primary entry to the rank selector", () => {
    expect(EXAM_PRACTICE_DESTINATIONS.promotionRankSelect).toBe(
      "/gigalearn/exam/promotion/"
    );
    const centre = readFileSync(
      resolve(ROOT, "web/components/gigalearn/exam/ExamPracticeCentre.tsx"),
      "utf8"
    );
    expect(centre).toContain("promotionRankSelect");
    expect(centre).toContain("teacher-promotion-primary-cta");
    const redirects = readFileSync(
      resolve(ROOT, "web/lib/chat/productRedirects.ts"),
      "utf8"
    );
    expect(redirects).toContain('"/teacher-promotion": "/gigalearn/exam/promotion/"');
  });

  it("ships a dedicated rank-selector page and component", () => {
    const page = readFileSync(
      resolve(ROOT, "web/app/(marketing)/gigalearn/exam/promotion/page.tsx"),
      "utf8"
    );
    expect(page).toContain("PromotionRankSelector");
    const ui = readFileSync(
      resolve(ROOT, "web/components/gigalearn/exam/PromotionRankSelector.tsx"),
      "utf8"
    );
    expect(ui).toContain("Start Free Practice");
    expect(ui).toContain("Assistant Director II");
    expect(ui).toContain("Director I");
    expect(ui).toContain("promotion-rank-card-${rank.id}");
    expect(ui).toContain("Start Free Practice");
    expect(ui).toContain("data-testid={`promotion-start-free-${rank.id}`}");
  });

  it("reports honest live bank counts of 550 distinct items per rank", () => {
    expect(PROMOTION_RANK_TARGET_COUNT).toBe(550);
    expect(PROMOTION_RANK_BANK_SUMMARIES).toHaveLength(5);
    for (const bank of PROMOTION_RANK_BANK_SUMMARIES) {
      const meta = getExamBankMeta(bank.courseSlug!);
      expect(meta).toBeTruthy();
      const published =
        (meta!.approvedQuestionCount ?? 0) + (meta!.pendingQuestionCount ?? 0);
      expect(published).toBe(550);
      expect(bank.publishedCount).toBe(550);
      expect(bank.gapToTarget).toBe(0);
      expect(bank.practiceHref).toContain("mode=learn");
    }
    expect(PROMOTION_RANK_BANKS_TOTAL.published).toBe(2750);
    expect(PROMOTION_RANK_BANKS_TOTAL.gap).toBe(0);
  });
});
