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
