/**
 * Teacher Promotion free-practice → premium upgrade UX + dismissal rules.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  clearPremiumUpgradeModalDismiss,
  dismissPremiumUpgradeModal,
  isPremiumUpgradeModalSuppressed,
  PREMIUM_UPGRADE_DISMISS_COOLDOWN_MS,
} from "../../web/lib/gigalearn/examPractice/premiumUpgradeDismiss";
import {
  FOUNDING_MEMBERS_MAX_ALLOCATIONS,
  FOUNDING_MEMBERS_PRICE_GHS,
} from "../../web/lib/gigalearn/examPractice/foundingMembersOffer";
import { SUBSCRIPTION_PLANS } from "../../web/lib/payments/subscriptionCatalog";

const ROOT = resolve(__dirname, "../..");

describe("premium upgrade dismiss persistence", () => {
  const store = new Map<string, string>();

  afterEach(() => {
    store.clear();
    clearPremiumUpgradeModalDismiss();
  });

  it("does not suppress by default", () => {
    // jsdom/happy-dom may be absent — stub localStorage for Node vitest.
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: globalThis,
    });
    expect(isPremiumUpgradeModalSuppressed("promotion-free-50", 1_000_000)).toBe(
      false
    );
  });

  it("suppresses auto-modal after dismiss within cooldown", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: globalThis,
    });
    const now = 5_000_000;
    dismissPremiumUpgradeModal("promotion-free-50", now);
    expect(isPremiumUpgradeModalSuppressed("promotion-free-50", now + 1000)).toBe(
      true
    );
    expect(
      isPremiumUpgradeModalSuppressed(
        "promotion-free-50",
        now + PREMIUM_UPGRADE_DISMISS_COOLDOWN_MS + 1
      )
    ).toBe(false);
  });

  it("does not suppress a different practice set id", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: globalThis,
    });
    dismissPremiumUpgradeModal("promotion-free-50", 1_000);
    expect(isPremiumUpgradeModalSuppressed("other-set", 1_100)).toBe(false);
  });
});

describe("premium upgrade UX wiring (source)", () => {
  const modal = readFileSync(
    resolve(ROOT, "web/components/gigalearn/exam/PremiumUpgradeModal.tsx"),
    "utf8"
  );
  const quiz = readFileSync(
    resolve(ROOT, "web/components/gigalearn/exam/ExamQuizSession.tsx"),
    "utf8"
  );
  const root = readFileSync(
    resolve(ROOT, "web/components/gigalearn/exam/ExamPracticeSessionRoot.tsx"),
    "utf8"
  );
  const nudge = readFileSync(
    resolve(ROOT, "web/components/gigalearn/exam/PremiumPracticeNudge.tsx"),
    "utf8"
  );
  const schema = readFileSync(resolve(ROOT, "convex/schema.ts"), "utf8");

  it("shows GHS 30 founding + GHS 60 Basic + credits options with honest copy", () => {
    expect(modal).toContain("Founding Teacher Offer");
    expect(modal).toContain("FOUNDING_MEMBERS_PRICE_GHS");
    expect(FOUNDING_MEMBERS_PRICE_GHS).toBe(30);
    expect(modal).toContain("successful purchases");
    expect(modal).toContain("FOUNDING_MEMBERS_MAX_ALLOCATIONS");
    expect(FOUNDING_MEMBERS_MAX_ALLOCATIONS).toBe(30);
    expect(modal).toContain("sub_basic_monthly");
    expect(modal).toContain("basicPrice");
    expect(SUBSCRIPTION_PLANS.basic.priceGhs).toBe(60);
    expect(modal).toContain("View credit options");
    expect(modal).toContain("Residual wallet balance alone does");
    expect(modal).toContain("Maybe later");
    expect(modal).toContain("View my results");
    expect(modal).not.toMatch(/sk_live_|PAYSTACK_SECRET/);
  });

  it("auto-opens modal only after free practice completion and respects dismiss", () => {
    expect(quiz).toContain("enablePremiumUpgrade");
    expect(quiz).toContain("isPremiumUpgradeModalSuppressed");
    expect(quiz).toContain("free_practice_completed");
    expect(quiz).toContain("setUpgradeOpen(true)");
    expect(root).toContain("free-practice-prestart");
    expect(root).toContain("free_practice_started");
    expect(root).toContain("enablePremiumUpgrade");
  });

  it("places premium messaging before / during / after free practice", () => {
    expect(nudge).toContain('variant === "prestart"');
    expect(nudge).toContain('variant === "insession"');
    expect(nudge).toContain('variant === "locked"');
    expect(nudge).toContain("premium-nudge-results");
    expect(quiz).toContain('variant="insession"');
    expect(quiz).toContain('variant="results"');
    expect(root).toContain('variant="prestart"');
  });

  it("records funnel analytics event types in Convex schema", () => {
    expect(schema).toContain('v.literal("free_practice_started")');
    expect(schema).toContain('v.literal("free_practice_completed")');
    expect(schema).toContain('v.literal("upgrade_modal_shown")');
    expect(schema).toContain('v.literal("upgrade_ghs30_selected")');
    expect(schema).toContain('v.literal("upgrade_ghs60_selected")');
    expect(schema).toContain('v.literal("payment_initiated")');
  });
});
