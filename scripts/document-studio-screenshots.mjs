/**
 * Capture Document Studio / marketplace screenshots at mobile and tablet widths.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.SCREENSHOT_BASE || "http://localhost:3001";
const OUT = "/opt/cursor/artifacts";
mkdirSync(OUT, { recursive: true });

const shots = [
  { path: "/documents/", width: 390, height: 844, name: "documents-390.png", wait: "text=Export PDF" },
  { path: "/documents/", width: 360, height: 800, name: "documents-360.png", wait: "text=Export PDF" },
  { path: "/documents/", width: 768, height: 900, name: "documents-768.png", wait: "text=Export PDF" },
  { path: "/marketplace/", width: 390, height: 844, name: "marketplace-390.png", wait: "text=Marketplace" },
  { path: "/marketplace/sell/", width: 390, height: 844, name: "marketplace-sell-390.png", wait: "text=Identity verification" },
  { path: "/gigalearn/", width: 390, height: 844, name: "gigalearn-390.png", wait: "text=GigaLearn" },
];

const browser = await chromium.launch({ headless: true });
const results = [];

for (const shot of shots) {
  const context = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const url = `${BASE}${shot.path}`;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2500);
    await page.waitForSelector(shot.wait, { timeout: 20000 }).catch(() => {});
    // Prefer a CV template if present so the studio shows rich content.
    if (shot.path.startsWith("/documents")) {
      const cv = page.getByRole("button", { name: /CV/i }).first();
      if (await cv.count()) {
        await cv.click().catch(() => {});
        await page.waitForTimeout(500);
      }
    }
    const file = join(OUT, shot.name);
    await page.screenshot({ path: file, fullPage: false });
    results.push({ ok: true, file, url, width: shot.width });
    console.log("ok", shot.name);
  } catch (err) {
    results.push({ ok: false, url, error: String(err) });
    console.error("fail", shot.name, err);
  }
  await context.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
