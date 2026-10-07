import { expect, test } from "@playwright/test";
import {
  readLiveCacheVersion,
  readRepoCacheVersion,
  shouldCompareRepoCacheVersion,
} from "./helpers/serviceWorker";

test.describe("Production — service worker", () => {
  test("live /sw.js exposes a CACHE_VERSION and registers on chat route", async ({ page }) => {
    await page.goto("/chat/");
    const liveVersion = await readLiveCacheVersion(page);
    expect(liveVersion, "production CACHE_VERSION in /sw.js").toBeTruthy();
    expect(liveVersion).toMatch(/^giga3-v\d+$/);

    const registered = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return false;
      const reg = await navigator.serviceWorker.getRegistration();
      return Boolean(reg);
    });
    expect(registered).toBe(true);
  });

  test("production CACHE_VERSION matches repository release when comparison enabled", async ({
    page,
  }) => {
    test.skip(!shouldCompareRepoCacheVersion(), "Repo SW comparison disabled via GIGA3_E2E_COMPARE_REPO_SW");

    const expected = readRepoCacheVersion();
    expect(expected, "repository web/public/sw.js CACHE_VERSION").toBeTruthy();

    await page.goto("/");
    const liveVersion = await readLiveCacheVersion(page);
    expect(
      liveVersion,
      `production SW (${liveVersion}) should match repo release (${expected}) — bump CACHE_VERSION and redeploy if intentional`
    ).toBe(expected);
  });
});
