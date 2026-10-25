import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import {
  annualTargetBreakdown,
  computeGoalProgress,
  DEFAULT_ANNUAL_ASPIRATION_GHS,
  sumScenarioAnnual,
} from "../../web/lib/gigasocial/creatorEarnings/annualGoalPlanner";
import { EARNING_SOURCES } from "../../web/lib/gigasocial/creatorEarnings/earningSources";
import {
  deriveMonetizationStatus,
  eligibilityChecklist,
} from "../../web/lib/gigasocial/creatorEarnings/monetizationStatus";
import {
  isRewardClaimable,
  REWARD_CATALOGUE,
} from "../../web/lib/gigasocial/creatorEarnings/rewardCatalogue";
import { MIN_FANS_FOR_MONETIZATION } from "../../web/lib/gigasocial/creatorEconomy";
import {
  computeVerifiedCashEarningsGhs,
  sumPaystackGiftEarningsGhs,
} from "../../convex/gigaSocialEarningsMath";

const root = resolve(__dirname, "../..");

describe("creator earnings centre — pure rules", () => {
  it("keeps the 500-fan monetisation threshold", () => {
    expect(MIN_FANS_FOR_MONETIZATION).toBe(500);
    const economy = readFileSync(resolve(root, "convex/gigaSocialEconomy.ts"), "utf8");
    expect(economy).toContain("MIN_FANS_FOR_MONETIZATION = 500");
    expect(economy).not.toMatch(/minFansForMonetization >= 100/);
  });

  it("derives status below and above the fan threshold", () => {
    expect(
      deriveMonetizationStatus({ fanEligible: false, accepted: false })
    ).toBe("not_yet_eligible");
    expect(
      deriveMonetizationStatus({ fanEligible: true, accepted: false })
    ).toBe("eligible_to_apply");
    // Consent + fans alone is NOT "approved" — requires application.status === approved.
    expect(
      deriveMonetizationStatus({ fanEligible: true, accepted: true })
    ).toBe("eligible_to_apply");
    expect(
      deriveMonetizationStatus({
        fanEligible: true,
        accepted: true,
        application: { status: "approved" },
      })
    ).toBe("monetization_approved");
    expect(
      deriveMonetizationStatus({
        fanEligible: true,
        accepted: true,
        application: { status: "under_review" },
      })
    ).toBe("under_review");
    expect(
      deriveMonetizationStatus({
        fanEligible: true,
        accepted: false,
        application: { status: "rejected" },
      })
    ).toBe("monetization_rejected");
    expect(
      deriveMonetizationStatus({
        fanEligible: true,
        accepted: true,
        application: { status: "suspended" },
      })
    ).toBe("temporarily_suspended");
  });

  it("does not double-count tips inside verified cash math", () => {
    const paystackOnly = sumPaystackGiftEarningsGhs([
      { amountGhs: 8, paymentReference: "ref_a" },
      { amountGhs: 2, paymentReference: null },
      { amountGhs: 5, paymentReference: "ref_b" },
    ]);
    expect(paystackOnly).toBe(13);
    // Tips + marketplace purchases — never tips + totalEarningsGhs (which also includes tips).
    expect(
      computeVerifiedCashEarningsGhs({
        paystackGiftEarningsGhs: 13,
        marketplacePurchaseEarningsGhs: 40,
      })
    ).toBe(53);
  });

  it("requires provider reference before admin marks payout paid", () => {
    const admin = readFileSync(
      resolve(root, "convex/adminMarketplace.ts"),
      "utf8"
    );
    expect(admin).toContain(
      "Provider confirmation reference is required before marking a payout as paid"
    );
  });

  it("blocks suspended creators from re-submitting applications", () => {
    const economy = readFileSync(
      resolve(root, "convex/gigaSocialEconomy.ts"),
      "utf8"
    );
    expect(economy).toContain("Monetisation is suspended");
    expect(economy).toContain("creditedToPayoutAt");
  });

  it("builds an eligibility checklist without inventing private fraud signals", () => {
    const rows = eligibilityChecklist({
      fanCount: 120,
      fansRequired: 500,
      accepted: false,
      accountStandingOk: true,
      hasSocialProfile: true,
    });
    expect(rows.find((r) => r.id === "fans")?.met).toBe(false);
    expect(rows.find((r) => r.id === "profile")?.met).toBe(true);
    expect(JSON.stringify(rows)).not.toMatch(/fraud|risk.?score/i);
  });

  it("computes annual goal math without fabricating rates", () => {
    expect(DEFAULT_ANNUAL_ASPIRATION_GHS).toBe(100_000);
    const parts = annualTargetBreakdown(100_000);
    expect(parts.perMonth).toBeCloseTo(8333.333, 2);
    expect(parts.perWeek).toBeCloseTo(1923.076, 2);
    expect(parts.perDay).toBeCloseTo(273.972, 2);

    const shortHistory = computeGoalProgress({
      annualTargetGhs: 100_000,
      verifiedYtdGhs: 0,
      daysElapsedInPeriod: 10,
    });
    expect(shortHistory.reliableProjection).toBe(false);
    expect(shortHistory.remainingGhs).toBe(100_000);

    const longer = computeGoalProgress({
      annualTargetGhs: 100_000,
      verifiedYtdGhs: 12_000,
      daysElapsedInPeriod: 90,
    });
    expect(longer.reliableProjection).toBe(true);
    expect(longer.percentReached).toBeCloseTo(12, 5);
    expect(sumScenarioAnnual({ tips: 1000, marketplace: 500 }).annualTotal).toBe(18_000);
  });

  it("marks advertising and unfunded cash rewards as not active", () => {
    expect(EARNING_SOURCES.find((s) => s.id === "advertising_revenue_share")?.availability).toBe(
      "not_available"
    );
    expect(EARNING_SOURCES.find((s) => s.id === "viewer_tips_gifts")?.availability).toBe("active");
    const cash = REWARD_CATALOGUE.find((r) => r.id === "cash_bonus_placeholder");
    expect(cash).toBeTruthy();
    expect(isRewardClaimable(cash!)).toBe(false);
  });

  it("separates unfunded content estimates from withdrawable cash in the economy query", () => {
    const economy = readFileSync(resolve(root, "convex/gigaSocialEconomy.ts"), "utf8");
    expect(economy).toContain("unfundedContentBonusEstimateGhs");
    expect(economy).toContain("verifiedCashEarningsGhs");
    expect(economy).toContain("creditPaystackTipToPayoutBalance");
    expect(economy).toContain("computeVerifiedCashEarningsGhs");
    expect(economy).toContain("marketplacePurchases");
    expect(economy).toContain("submitMonetizationApplication");
    expect(economy).toContain("automatedTransfer: false");
  });

  it("wires Earnings Centre UI and static earnings route", () => {
    const centre = readFileSync(
      resolve(root, "web/components/gigasocial/economy/GigaSocialEarningsCentre.tsx"),
      "utf8"
    );
    const panel = readFileSync(
      resolve(root, "web/components/gigasocial/economy/GigaSocialCreatorPanel.tsx"),
      "utf8"
    );
    const page = readFileSync(
      resolve(root, "web/app/(marketing)/gigasocial/earnings/page.tsx"),
      "utf8"
    );
    expect(centre).toContain("Earnings, Rewards & Awards");
    expect(centre).toContain("not a promise");
    expect(centre).toContain("GH₵100,000");
    expect(panel).toContain("GigaSocialEarningsCentre");
    expect(panel).toContain('"earnings"');
    expect(page).toContain("/gigasocial/?tab=creator&creatorTab=earnings");
    // Single SSR H1 comes from ProductSeoHeader (avoid dual-H1 SEO failure).
    expect(page).toContain("ProductSeoHeader");
    expect(page).toContain('title="Creator Earnings Centre"');
    expect(page).not.toMatch(/<main[\s\S]*?<h1/);
  });

  it("documents Phase 0 research and rejects fake ad revenue claims", () => {
    const doc = readFileSync(
      resolve(root, "docs/gigasocial-creator-earnings-phase0.md"),
      "utf8"
    );
    expect(doc).toContain("Paystack");
    expect(doc).toContain("500");
    expect(doc).toContain("Access date");
  });
});
