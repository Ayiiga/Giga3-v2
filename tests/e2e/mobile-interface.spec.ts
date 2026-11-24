import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("Learn exposes each school band, the university pathway and searchable tools", async ({ page }) => {
  await page.goto("/gigalearn/");
  const home = page.locator(".learning-home");
  for (const [name, levels] of [["Early Years", 2], ["Basic 1–6", 6], ["JHS", 3], ["SHS", 3]] as const) {
    await home.getByRole("button", { name, exact: true }).click();
    await expect(home.locator('a[href*="tab=learn"],a[href*="tab=early-years"]')).toHaveCount(levels);
  }
  await home.getByRole("button", { name: "University" }).click();
  await expect(home.getByRole("link", { name: /University study/ })).toBeVisible();
  await home.getByRole("searchbox").fill("worksheets");
  await expect(home.getByRole("link", { name: /Teaching materials/ })).toBeVisible();
  await expect(home.locator(".learning-tools a")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("Discover keeps the keyboard target while filters and results update", async ({ page }) => {
  await page.goto("/gigasocial/?tab=discover");
  const input = page.getByRole("textbox", { name: "Search posts", exact: true });
  await input.fill("science");
  // Wait beyond the search debounce so this also covers the query's loading state.
  await expect.poll(() => input.evaluate(node => document.activeElement === node), {
    intervals: [350],
  }).toBe(true);
  await input.pressSequentially(" lesson", { delay: 80 });
  await expect(input).toHaveValue("science lesson");
  await expect(input).toBeFocused();
  const filter = page.getByRole("button", { name: "Education", exact: true }).last();
  await filter.click();
  await expect(filter).toHaveAttribute("aria-pressed", "true");
  await expect(input).toHaveValue("science lesson");
});

test("Social media stage loops photos and keeps manual controls on screen", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "onLine", { get: () => false });
    const now = Date.now();
    localStorage.setItem("gigasocial-feed-offline-snapshot-v1", JSON.stringify({
      savedAt: now, posts: [{
        _id: "local-gallery", body: "Science field notes", mediaType: "gallery", postType: "image",
        mediaUrls: ["/images/interface/course.webp", "/images/interface/jhs.webp"], createdAt: now,
        author: { displayName: "Science Club", handle: "scienceclub" }, likeCount: 2, commentCount: 0, shareCount: 0,
      }],
    }));
  });
  await page.goto("/gigasocial/", { waitUntil: "domcontentloaded" });
  const card = page.locator("#gigasocial-feed-posts article").first();
  await card.locator(".gigasocial-post-card__media-region").evaluate(el => el.scrollIntoView({ block: "start" }));
  const controls = card.getByRole("group", { name: "Photo controls" });
  await expect(controls.getByRole("button", { name: "Pause slideshow" })).toBeVisible();
  await expect(controls).toContainText("2 / 2", { timeout: 8500 });
  await controls.getByRole("button", { name: "Pause slideshow" }).click();
  await controls.getByRole("button", { name: "Next photo" }).click();
  await expect(controls).toContainText("1 / 2");
  const frame = card.locator(".gigasocial-feed-media--gallery").first();
  await frame.evaluate(target => {
    const touch = (clientX: number) => new Touch({ identifier: 1, target, clientX, clientY: 120 });
    target.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [touch(160)] }));
    target.dispatchEvent(new TouchEvent("touchend", { bubbles: true, changedTouches: [touch(65)] }));
  });
  await expect(controls).toContainText("2 / 2");
  await expect(card.getByRole("button", { name: "Save post", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Feed navigation" }).getByText("Create")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
