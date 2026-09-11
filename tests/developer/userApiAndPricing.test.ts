import { describe, expect, it } from "vitest";
import {
  buildPublicPlanSummaryLines,
  FREE_STARTER_CREDITS,
  SUBSCRIPTION_PLANS,
} from "@/lib/payments/marketingPricing";
import { buildUserDeveloperApiUrl, getUserDeveloperApiBaseUrl } from "@/lib/developer/userApi";
import { formatGhs } from "@/lib/payments/plans";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("user developer API urls", () => {
  it("builds the Premium user API base URL", () => {
    expect(getUserDeveloperApiBaseUrl()).toMatch(/\/api\/v1$/);
  });

  it("builds endpoint URLs", () => {
    expect(buildUserDeveloperApiUrl("me")).toContain("/api/v1/me");
  });
});

describe("public pricing summary lines", () => {
  it("derives rows from subscriptionCatalog via marketingPricing", () => {
    const rows = buildPublicPlanSummaryLines();
    expect(rows).toHaveLength(5);
    expect(rows[0]).toEqual({
      name: "Free",
      price: formatGhs(0),
      detail: `${FREE_STARTER_CREDITS} starter credits`,
    });
    expect(rows[1].name).toBe(SUBSCRIPTION_PLANS.basic.label);
    expect(rows[2].name).toBe(SUBSCRIPTION_PLANS.pro.label);
    expect(rows[3].name).toBe(SUBSCRIPTION_PLANS.premium.label);
    expect(rows[4].name).toBe("Enterprise");
  });

  it("is imported by pricing and ai-for-ghana pages", () => {
    const pricing = readFileSync(
      resolve(__dirname, "../../web/app/(marketing)/pricing/page.tsx"),
      "utf8"
    );
    const ghana = readFileSync(
      resolve(__dirname, "../../web/app/(marketing)/ai-for-ghana/page.tsx"),
      "utf8"
    );
    expect(pricing).toContain("buildPublicPlanSummaryLines");
    expect(ghana).toContain("buildPublicPlanSummaryLines");
  });
});

describe("developers page honesty", () => {
  it("documents both GigaSocial and Premium user APIs with live endpoints only", () => {
    const page = readFileSync(
      resolve(__dirname, "../../web/app/(marketing)/developers/page.tsx"),
      "utf8"
    );
    expect(page).toContain("GigaSocial read API");
    expect(page).toContain("Premium user API");
    expect(page).toContain("DeveloperApiKeysPanel");
    expect(page).toContain('id="user-api-keys"');
    expect(page).toContain("not available yet");
    expect(page).not.toContain("no public self-serve key UI yet");
  });
});
