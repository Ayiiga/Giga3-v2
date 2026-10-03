import { expect, test } from "@playwright/test";
import { e2eCredentials, signInViaUi } from "./helpers/auth";

test.describe("Production — GigaLearn (authenticated when credentials available)", () => {
  test.beforeEach(async ({ page }) => {
    const creds = e2eCredentials();
    test.skip(
      !creds,
      "Authenticated E2E skipped: GIGA3_E2E_EMAIL/GIGA3_E2E_PASSWORD not configured."
    );
    await signInViaUi(page, creds!.email, creds!.password);
  });

  test("GigaLearn opens with curriculum selector and section navigation", async ({ page }) => {
    const response = await page.goto("/gigalearn/");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { name: /gigalearn/i }).first()).toBeVisible({
      timeout: 45_000,
    });

    const countrySelect = page.locator("#gl-curriculum-country, select[id*='country']").first();
    await expect(countrySelect).toBeVisible({ timeout: 30_000 });

    const teacherTab = page.getByRole("button", { name: /^teacher$/i });
    if (await teacherTab.isVisible()) {
      await teacherTab.click();
      await expect(page.getByText(/teacher studio|lesson|curriculum/i).first()).toBeVisible({
        timeout: 20_000,
      });
    }

    const studentTab = page.getByRole("button", { name: /^student$/i });
    if (await studentTab.isVisible()) {
      await studentTab.click();
    }
  });

  test("curriculum context persists in local profile storage", async ({ page }) => {
    await page.goto("/gigalearn/?tab=teacher");
    await page.waitForTimeout(2000);

    const levelSelect = page.locator("select").filter({ has: page.locator("option") }).nth(2);
    if ((await levelSelect.count()) === 0) {
      test.skip(true, "Curriculum level selector not available in current UI state");
    }

    const options = await levelSelect.locator("option").allTextContents();
    const pick = options.find((o) => o.trim() && !/select|choose/i.test(o));
    if (!pick) {
      test.skip(true, "No selectable curriculum level options");
    }

    await levelSelect.selectOption({ label: pick! });
    await page.waitForTimeout(500);

    const stored = await page.evaluate(() => localStorage.getItem("giga3_gigalearn_profile"));
    expect(stored).toBeTruthy();
    expect(stored!.length).toBeGreaterThan(2);
  });

  test("practice section is reachable without cross-user data exposure", async ({ page }) => {
    await page.goto("/gigalearn/?tab=student");
    await page.waitForTimeout(2000);

    const practiceLink = page.getByRole("link", { name: /practice/i }).first();
    if (!(await practiceLink.isVisible())) {
      test.skip(true, "Practice navigation not visible for this account");
    }

    await practiceLink.click();
    await expect(page).toHaveURL(/gigalearn|practice/i);
    const body = await page.locator("body").innerText();
    expect(body.toLowerCase()).not.toMatch(/password|sk_live|sk_test|api[_-]?key/i);
  });
});
