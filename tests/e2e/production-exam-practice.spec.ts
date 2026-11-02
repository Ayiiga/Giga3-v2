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

      // Free practice starts at a pre-start screen before showing questions.
      if (path.includes("/exam/practice")) {
        await expect(page.getByTestId("free-practice-prestart")).toBeVisible({
          timeout: 45_000,
        });
      }
    });
  }

  test("Exam Centre links to the current promotion, BECE, and WASSCE centres", async ({ page }) => {
    await page.goto("/gigalearn/exam/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => undefined);

    const hub = page.getByTestId("exam-practice-hub");
    await expect(hub).toBeVisible({ timeout: 45_000 });
    for (const centre of ["promotion", "bece", "wassce"]) {
      await expect(page.getByTestId(`exam-centre-${centre}`)).toBeVisible();
    }
    await expect(page.getByTestId("exam-centre-promotion")).toHaveAttribute(
      "href",
      "/gigalearn/exam/promotion/"
    );
    await expect(page.getByTestId("exam-centre-bece")).toHaveAttribute(
      "href",
      "/gigalearn/exam/bece/"
    );
    await expect(page.getByTestId("exam-centre-wassce")).toHaveAttribute(
      "href",
      "/gigalearn/exam/wassce/"
    );
  });

  test("Free practice: pre-start, option notes, reward on correct, no stale notes after Next", async ({
    page,
  }) => {
    await page.goto("/gigalearn/exam/practice/", { waitUntil: "domcontentloaded" });
    await page.getByTestId("free-practice-begin").click();
    await page.locator("button.exam-session-option").first().waitFor({ timeout: 45_000 });

    const savedDraft = await page.evaluate(() =>
      sessionStorage.getItem("giga3_exam_practice_free_draft_v1")
    );
    if (!savedDraft) throw new Error("Free practice draft was not saved before answering");
    await page.locator("button.exam-session-option").nth(0).click();
    const correctText = await page.locator('[data-testid="exam-option-note-correct"]').innerText();
    const letter = correctText.match(/^([A-D])\./)?.[1];
    expect(letter).toBeTruthy();
    expect(await page.locator('[data-testid="exam-option-note"]').count()).toBeGreaterThanOrEqual(3);

    await page.evaluate(
      (draft) => sessionStorage.setItem("giga3_exam_practice_free_draft_v1", draft),
      savedDraft
    );
    await page.reload({ waitUntil: "domcontentloaded" });
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

  test("AD II premium learn pack: feedback + reward after answer; Next clears stale", async ({
    page,
  }) => {
    await page.goto(
      "/gigalearn/academy/tech/?course=exam-ad-ii&mode=learn&qtype=mcq&count=10",
      { waitUntil: "domcontentloaded" }
    );
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => undefined);

    const start = page.getByRole("button", { name: /start|begin|practise|practice/i }).first();
    if (await start.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await start.click();
    }
    const option = page.locator("button.exam-session-option, button.exam-session-tf").first();
    await option.waitFor({ state: "visible", timeout: 60_000 });

    // Incorrect first: no correct-answer praise required; notes must appear.
    await option.click();
    await expect(
      page.locator('[data-testid="exam-option-note"], [data-testid="exam-option-note-correct"]').first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".exam-session-option--correct, .exam-session-tf--correct")).toHaveCount(
      1
    );

    const notesQ1 = await page
      .locator('[data-testid="exam-option-note"], [data-testid="exam-option-note-correct"]')
      .allInnerTexts();
    expect(notesQ1.length).toBeGreaterThanOrEqual(2);

    // Repeated tap must not unlock a second reward pulse (options disabled).
    await expect(option).toBeDisabled();

    await page.getByRole("button", { name: /next/i }).click();
    await expect(
      page.locator('[data-testid="exam-option-note"], [data-testid="exam-option-note-correct"]')
    ).toHaveCount(0);

    // Answer Q2 via last option; feedback must be for this question.
    const opts = page.locator("button.exam-session-option, button.exam-session-tf");
    const n = await opts.count();
    await opts.nth(Math.max(0, n - 1)).click();
    await expect(
      page.locator('[data-testid="exam-option-note"], [data-testid="exam-option-note-correct"]').first()
    ).toBeVisible({ timeout: 20_000 });
    const notesQ2 = await page
      .locator('[data-testid="exam-option-note"], [data-testid="exam-option-note-correct"]')
      .allInnerTexts();
    expect(JSON.stringify(notesQ2)).not.toBe(JSON.stringify(notesQ1));
  });
});
