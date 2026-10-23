/**
 * Production smoke + optional authenticated checks for Teacher Promotion Exam Practice.
 * Authenticated cases skip unless GIGA3_E2E_EMAIL / GIGA3_E2E_PASSWORD are set.
 */
import { expect, test } from "@playwright/test";
import { e2eCredentials, signInViaUi } from "./helpers/auth";

const PUBLIC_EXAM_ROUTES = [
  "/gigalearn/exam/",
  "/gigalearn/exam/practice/",
  "/gigalearn/academy/",
  "/gigalearn/academy/tech/?course=exam-ad-ii&count=50",
  "/gigalearn/academy/tech/?course=exam-ad-i&count=50",
  "/gigalearn/academy/tech/?course=exam-deputy-director&count=50",
  "/gigalearn/academy/tech/?course=exam-director-ii&count=50",
  "/gigalearn/academy/tech/?course=exam-director-i&count=50",
  "/gigalearn/academy/tech/?course=exam-teacher-promotion&count=50",
] as const;

test.describe("Production — Exam Practice public routes", () => {
  for (const path of PUBLIC_EXAM_ROUTES) {
    test(`${path} returns 200 without answer-key leakage markers`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${path} HTTP status`).toBe(200);

      await page.waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => undefined);

      const html = await page.content();
      expect(html, `${path} must not embed correctIndex`).not.toMatch(/correctIndex/);
      expect(html, `${path} must not embed correctOptionId`).not.toMatch(/correctOptionId/);

      // Free practice should show a stem/options UI once hydrated.
      if (path.includes("/exam/practice")) {
        await expect(
          page.getByText(/question|option|practice|time|submit|next/i).first()
        ).toBeVisible({ timeout: 45_000 });
      }
    });
  }

  test("Exam Centre links to free practice and rank banks", async ({ page }) => {
    await page.goto("/gigalearn/exam/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => undefined);

    await expect(page.getByRole("link", { name: /free practice|start free/i }).first()).toBeVisible({
      timeout: 45_000,
    });

    for (const label of [
      /assistant director ii/i,
      /assistant director i/i,
      /deputy director/i,
      /director ii/i,
      /director i/i,
    ]) {
      await expect(page.getByText(label).first()).toBeVisible({ timeout: 30_000 });
    }

    // Rank MCQ CTAs must open learn mode (immediate explanations), not timed default.
    const mcqHrefs = await page
      .locator('a', { hasText: /MCQ practice/i })
      .evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
    expect(mcqHrefs.length).toBeGreaterThanOrEqual(5);
    for (const href of mcqHrefs) {
      expect(href, href).toMatch(/mode=learn/);
      expect(href).toMatch(/course=exam-(ad-ii|ad-i|deputy-director|director-ii|director-i)/);
    }
  });

  test("Free practice: option notes, reward on correct, no stale notes after Next", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto("/gigalearn/exam/practice/", { waitUntil: "domcontentloaded" });
    await page.locator("button.exam-session-option").first().waitFor({ timeout: 45_000 });

    // Probe correct letter, then restart clean and select it.
    await page.locator("button.exam-session-option").nth(0).click();
    const correctText = await page.locator('[data-testid="exam-option-note-correct"]').innerText();
    const letter = correctText.match(/^([A-D])\./)?.[1];
    expect(letter).toBeTruthy();
    expect(await page.locator('[data-testid="exam-option-note"]').count()).toBeGreaterThanOrEqual(3);

    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto("/gigalearn/exam/practice/", { waitUntil: "domcontentloaded" });
    await page.locator("button.exam-session-option").first().waitFor({ timeout: 45_000 });
    const idx = { A: 0, B: 1, C: 2, D: 3 }[letter as "A" | "B" | "C" | "D"] ?? 0;
    await page.locator("button.exam-session-option").nth(idx).click();
    await expect(page.locator('[data-testid="exam-reward"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".exam-session-option--correct")).toHaveCount(1);
    await expect(page.locator('[data-testid="exam-option-note-correct"]')).toBeVisible();

    await page.getByRole("button", { name: /next/i }).click();
    await expect(page.locator('[data-testid="exam-option-note"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="exam-reward"]')).toHaveCount(0);
    await expect(page.getByText(/question 2 of/i)).toBeVisible();
  });
});

test.describe("Production — Exam Practice authenticated (optional)", () => {
  test.beforeEach(async ({ page }) => {
    const creds = e2eCredentials();
    test.skip(
      !creds,
      "Authenticated E2E skipped: GIGA3_E2E_EMAIL/GIGA3_E2E_PASSWORD not configured."
    );
    await signInViaUi(page, creds!.email, creds!.password);
  });

  test("Teacher Promotion tech practice starts without correctIndex in page HTML", async ({
    page,
  }) => {
    await page.goto("/gigalearn/academy/tech/?course=exam-teacher-promotion&count=10", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => undefined);

    // Enrol / start UI varies; ensure we never leak keys in the document.
    const html = await page.content();
    expect(html).not.toMatch(/"correctIndex"\s*:/);
    expect(html).not.toMatch(/"correctOptionId"\s*:/);

    const body = await page.locator("body").innerText();
    expect(body.toLowerCase()).not.toMatch(/sk_live|sk_test|api[_-]?key/);
  });

  test("AD II tech practice page loads for signed-in user without key leakage", async ({
    page,
  }) => {
    await page.goto("/gigalearn/academy/tech/?course=exam-ad-ii&count=10", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => undefined);

    const html = await page.content();
    expect(html).not.toMatch(/"correctIndex"\s*:/);
    expect(page.url()).toMatch(/exam-ad-ii/);
  });
});
