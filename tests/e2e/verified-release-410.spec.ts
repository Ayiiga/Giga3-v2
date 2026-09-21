import { expect, test } from "@playwright/test";
import {
  clearTtsLog,
  e2eCredentials,
  installTtsProbe,
  readTtsLog,
  signInViaUi,
} from "./helpers/auth";

const STRUCTURED_PROMPT =
  "Reply using exactly these markdown section headings on their own lines: ## Introduction, ## Main message, ## Conclusion. Keep each section to one short sentence about Ghana.";

test.describe("Release 410 — production smoke (unauthenticated)", () => {
  test("chat page returns 200 and registers service worker", async ({ page }) => {
    const response = await page.goto("/chat/");
    expect(response?.status()).toBe(200);

    const swVersion = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return null;
      const res = await fetch("/sw.js", { cache: "no-store" });
      const text = await res.text();
      const match = text.match(/CACHE_VERSION\s*=\s*"([^"]+)"/);
      return match?.[1] ?? null;
    });
    expect(swVersion).toBe("giga3-v9");
  });

  test("answer block CSS bundle is loaded on chat route", async ({ page }) => {
    await page.goto("/chat/");
    const cssHref = await page.evaluate(() => {
      const links = [...document.querySelectorAll('link[rel="stylesheet"]')] as HTMLLinkElement[];
      return links.map((l) => l.href).find((h) => /\/_next\/static\/css\/[a-f0-9]+\.css/.test(h)) ?? null;
    });
    expect(cssHref).toBeTruthy();
  });

  test("guest chat shell does not expose voice selector (auth-gated)", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile-only layout check");
    await page.goto("/chat/");
    await expect(page.getByLabel(/voice language/i)).toHaveCount(0);
    await expect(page.getByText(/sign in|log in|create account/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});

test.describe("Release 410 — authenticated workflows", () => {
  test.beforeEach(async ({ page }) => {
    const creds = e2eCredentials();
    test.skip(!creds, "Set GIGA3_E2E_EMAIL and GIGA3_E2E_PASSWORD for authenticated E2E");
    await installTtsProbe(page);
    await signInViaUi(page, creds!.email, creds!.password);
  });

  test("fresh chat opens with no active conversation and no create on load", async ({ page }) => {
    const createSignals: string[] = [];
    page.on("websocket", (ws) => {
      ws.on("framereceived", (frame) => {
        const payload = String(frame.payload ?? "");
        if (/conversations:create|createConversation/i.test(payload)) {
          createSignals.push(payload.slice(0, 200));
        }
      });
    });

    await page.goto("/chat/");
    await page.waitForTimeout(3000);

    const activeId = await page.evaluate(() => localStorage.getItem("giga3_chat_active_id"));
    expect(activeId).toBeNull();

    const welcomeOrEmpty = page.getByText(/new chat|message giga3|ask anything/i).first();
    await expect(welcomeOrEmpty).toBeVisible({ timeout: 30_000 });

    expect(createSignals).toHaveLength(0);
  });

  test("New Chat clears active conversation and stops speech", async ({ page }) => {
    await page.goto("/chat/");
    await installTtsProbe(page);

    const sidebarToggle = page.getByRole("button", { name: /open sidebar/i });
    if (await sidebarToggle.isVisible()) {
      await sidebarToggle.click();
    }

    const firstConversation = page.locator('[data-conversation-id]').first();
    if (await firstConversation.count()) {
      await firstConversation.click();
      await page.waitForTimeout(1500);
    }

    await clearTtsLog(page);
    const readBtn = page.getByRole("button", { name: /read aloud/i }).first();
    if (await readBtn.isVisible()) {
      await readBtn.click();
      await page.waitForTimeout(500);
    }

    const newChatBtn = page.getByRole("button", { name: /new chat/i });
    await newChatBtn.click();
    await page.waitForTimeout(500);

    const activeId = await page.evaluate(() => localStorage.getItem("giga3_chat_active_id"));
    expect(activeId).toBeNull();

    const log = await readTtsLog(page);
    if (log.some((e) => e.startsWith("speak:"))) {
      expect(log).toContain("cancel");
    }
  });

  test("structured answer blocks render with per-block actions", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto("/chat/");

    const composer = page.getByPlaceholder(/message giga3/i);
    await composer.fill(STRUCTURED_PROMPT);
    await composer.press("Enter");

    const blocks = page.locator(".answer-content-block");
    await expect(blocks.first()).toBeVisible({ timeout: 120_000 });
    expect(await blocks.count()).toBeGreaterThanOrEqual(2);

    const mainBlock = blocks.nth(1);
    await expect(mainBlock.getByRole("button", { name: /copy/i })).toBeVisible();
    await expect(mainBlock.getByRole("button", { name: /share/i })).toBeVisible();
    await expect(mainBlock.getByRole("button", { name: /read aloud/i })).toBeVisible();
  });

  test("block Share shares only the selected block text", async ({ page, context }) => {
    test.setTimeout(240_000);
    await page.goto("/chat/");

    const composer = page.getByPlaceholder(/message giga3/i);
    await composer.fill(STRUCTURED_PROMPT);
    await composer.press("Enter");

    const blocks = page.locator(".answer-content-block");
    await expect(blocks.first()).toBeVisible({ timeout: 120_000 });
    const mainBlock = blocks.nth(1);
    const mainText = (await mainBlock.locator(".answer-content-block__body").innerText()).trim();

    await page.evaluate(() => {
      (window as Window & { __gigaShareCapture?: { title?: string; text?: string } }).__gigaShareCapture =
        undefined;
      navigator.share = async (data: ShareData) => {
        (window as Window & { __gigaShareCapture?: ShareData }).__gigaShareCapture = {
          title: data.title,
          text: data.text,
        };
      };
    });

    await mainBlock.getByRole("button", { name: /share/i }).click();
    await page.waitForTimeout(500);

    const shared = await page.evaluate(() => {
      return (window as Window & { __gigaShareCapture?: { title?: string; text?: string } })
        .__gigaShareCapture;
    });
    expect(shared?.text).toContain(mainText.slice(0, 40));
    const introText = (await blocks.nth(0).locator(".answer-content-block__body").innerText()).trim();
    if (introText.length > 20) {
      expect(shared?.text ?? "").not.toContain(introText.slice(0, 20));
    }
  });

  test("block Copy copies only the selected block text", async ({ page, context }) => {
    test.setTimeout(240_000);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/chat/");

    const composer = page.getByPlaceholder(/message giga3/i);
    await composer.fill(STRUCTURED_PROMPT);
    await composer.press("Enter");

    const blocks = page.locator(".answer-content-block");
    await expect(blocks.first()).toBeVisible({ timeout: 120_000 });
    const mainBlock = blocks.nth(1);
    const mainText = (await mainBlock.locator(".answer-content-block__body").innerText()).trim();

    await mainBlock.getByRole("button", { name: /copy/i }).click();
    await page.waitForTimeout(500);

    const clipboard = await page.evaluate(async () => navigator.clipboard.readText());
    expect(clipboard).toContain(mainText.slice(0, 40));
    const introText = (await blocks.nth(0).locator(".answer-content-block__body").innerText()).trim();
    if (introText.length > 20) {
      expect(clipboard).not.toContain(introText.slice(0, 20));
    }
  });

  test("TTS cancellation: block2 cancel then speak after block1", async ({ page }) => {
    test.setTimeout(240_000);
    await clearTtsLog(page);
    await page.goto("/chat/");

    const composer = page.getByPlaceholder(/message giga3/i);
    await composer.fill(STRUCTURED_PROMPT);
    await composer.press("Enter");

    const blocks = page.locator(".answer-content-block");
    await expect(blocks.first()).toBeVisible({ timeout: 120_000 });

    await blocks.nth(0).getByRole("button", { name: /read aloud/i }).click();
    await page.waitForTimeout(400);
    await clearTtsLog(page);

    await blocks.nth(1).getByRole("button", { name: /read aloud/i }).click();
    await page.waitForTimeout(400);

    const log = await readTtsLog(page);
    expect(log).toContain("cancel");
    expect(log.some((e) => e.startsWith("speak:"))).toBe(true);
  });

  test("voice switching uses newly selected profile", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto("/chat/");

    const voiceSelect = page.getByLabel(/voice language/i);
    await expect(voiceSelect).toBeVisible();
    await voiceSelect.selectOption("musa-hausa");
    await page.waitForTimeout(200);

    const composer = page.getByPlaceholder(/message giga3/i);
    await composer.fill("Say hello in one short sentence.");
    await composer.press("Enter");

    await expect(page.getByRole("button", { name: /read aloud/i }).first()).toBeVisible({
      timeout: 120_000,
    });

    await clearTtsLog(page);
    await page.getByRole("button", { name: /read aloud/i }).first().click();
    await page.waitForTimeout(400);

    const stored = await page.evaluate(() => localStorage.getItem("giga3_voice_language_id"));
    expect(stored).toBe("musa-hausa");
  });

  test("mobile voice selector is visible below header", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile-only layout check");
    await page.goto("/chat/");
    await expect(page.getByLabel(/voice language/i)).toBeVisible();
    await expect(page.locator(".answer-block-actions__row").first()).toBeHidden();
  });
});
