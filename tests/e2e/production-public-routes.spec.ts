import { expect, test } from "@playwright/test";
import { isIndexable, isNoIndex, readPageMeta } from "./helpers/pageMeta";
import { PRODUCTION_PUBLIC_ROUTES } from "./helpers/productionRoutes";

test.describe("Production — public route smoke", () => {
  for (const route of PRODUCTION_PUBLIC_ROUTES) {
    test(`${route.path} returns 200 with title, canonical, and expected indexability`, async ({
      page,
    }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (err) => {
        consoleErrors.push(String(err));
      });

      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${route.path} HTTP status`).toBe(200);

      await page.waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => undefined);

      const fatal = consoleErrors.filter(
        (line) =>
          /ChunkLoadError|Loading chunk \d+ failed|Hydration failed/i.test(line) &&
          !/favicon|analytics|paystack|google/i.test(line)
      );
      expect(fatal, `Unrecoverable browser errors on ${route.path}`).toHaveLength(0);

      const meta = await readPageMeta(page);
      expect(meta.title, `${route.path} <title>`).toBeTruthy();
      expect((meta.title ?? "").length).toBeGreaterThanOrEqual(route.minTitleLength ?? 3);
      expect(meta.canonical, `${route.path} canonical`).toBeTruthy();
      expect(meta.canonical).toMatch(/^https:\/\/www\.giga3ai\.com\//);

      if (route.indexable) {
        expect(isIndexable(meta.robots), `${route.path} should be indexable`).toBe(true);
        expect(isNoIndex(meta.robots)).toBe(false);
      } else {
        expect(isNoIndex(meta.robots), `${route.path} should be noindex`).toBe(true);
      }
    });
  }
});
