import { expect, test } from "@playwright/test";
import { e2eCredentials, signInViaUi } from "./helpers/auth";
import { readPageMeta } from "./helpers/pageMeta";

test.describe("Production — Paystack safe checks (no transactions)", () => {
  test("pricing page loads with Paystack UI and public configuration surface", async ({ page }) => {
    const response = await page.goto("/pricing/");
    expect(response?.status()).toBe(200);

    const meta = await readPageMeta(page);
    expect(meta.title).toBeTruthy();
    expect(meta.canonical).toMatch(/\/pricing\/?$/);

    await expect(page.getByRole("heading", { name: /pricing|subscription plans/i }).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/paystack/i).first()).toBeVisible({ timeout: 30_000 });

    const payButtons = page.getByRole("button", { name: /paystack|subscribe|buy|top.?up/i });
    expect(await payButtons.count()).toBeGreaterThan(0);
  });

  test("mobile pricing avoids blocked Paystack iframe flash on load", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile-only Paystack iframe check");
    await page.goto("/pricing/");
    await page.waitForTimeout(2000);

    const blockedIframe = page.locator('iframe[src*="paystack"], iframe[title*="paystack" i]');
    await expect(blockedIframe).toHaveCount(0);

    const bodyText = await page.locator("body").innerText();
    expect(bodyText.toLowerCase()).not.toMatch(/content blocked|refused to display/i);
  });

  test("authenticated credits page exposes Paystack packs without immediate checkout error", async ({
    page,
  }) => {
    const creds = e2eCredentials();
    test.skip(
      !creds,
      "Authenticated E2E skipped: GIGA3_E2E_EMAIL/GIGA3_E2E_PASSWORD not configured."
    );

    await signInViaUi(page, creds!.email, creds!.password);
    const response = await page.goto("/credits/");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { name: /buy credits/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/paystack/i).first()).toBeVisible();
    await expect(page.getByText(/quick paystack top-ups|gh₵5|gh₵10|gh₵20/i).first()).toBeVisible({
      timeout: 30_000,
    });

    const errorBanner = page.locator('[role="alert"], .text-red-600, .text-destructive').filter({
      hasText: /paystack|checkout|payment/i,
    });
    await expect(errorBanner).toHaveCount(0);
  });

  test("real Paystack transaction E2E", async () => {
    const sandbox =
      process.env.GIGA3_PAYSTACK_SANDBOX_ENABLED?.trim().toLowerCase() === "true" &&
      Boolean(process.env.GIGA3_PAYSTACK_SANDBOX_PUBLIC_KEY?.trim());
    test.skip(
      !sandbox,
      "SKIPPED: Real Paystack transaction requires GIGA3_PAYSTACK_SANDBOX_ENABLED=true and GIGA3_PAYSTACK_SANDBOX_PUBLIC_KEY."
    );
  });
});
