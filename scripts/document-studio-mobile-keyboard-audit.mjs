/**
 * Mobile keyboard + bottom-nav clearance audit for Document Studio.
 * Simulates a shortened visual viewport (soft keyboard) and asserts export
 * actions remain reachable.
 */
import { chromium } from "playwright";

const BASE = process.env.SCREENSHOT_BASE || "http://127.0.0.1:3011";
const OUT = "/opt/cursor/artifacts";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
});
const page = await context.newPage();
const report = { base: BASE, steps: [] };

await page.goto(`${BASE}/documents/`, { waitUntil: "load", timeout: 45000 });
await page.waitForTimeout(3000);

const cv = page.getByRole("button", { name: /Professional CV \(A4\)/i }).first();
if (await cv.count()) {
  await cv.click();
  await page.waitForTimeout(800);
}

const actions = page.getByTestId("document-studio-actions");
await actions.waitFor({ timeout: 15000 });

// Inject primary-nav offset as production would on a primary-nav route.
await page.addStyleTag({
  content: `:root { --primary-nav-offset: calc(3.5rem + env(safe-area-inset-bottom, 0px)); }`,
});
await page.waitForTimeout(200);

const padBefore = await actions.evaluate((el) => getComputedStyle(el).paddingBottom);
report.steps.push({ name: "nav-offset-padding", paddingBottom: padBefore, ok: true });

await actions.scrollIntoViewIfNeeded();
await page.screenshot({ path: `${OUT}/audit-docs-nav-offset-390.png`, fullPage: false });

// Focus editor then shrink viewport to simulate soft keyboard.
const editor = page.locator(".ProseMirror").first();
await editor.click();
await page.waitForTimeout(300);
await page.setViewportSize({ width: 390, height: 420 });
await page.waitForTimeout(400);

await actions.scrollIntoViewIfNeeded();
const box = await actions.boundingBox();
const viewport = page.viewportSize();
const visible =
  box &&
  viewport &&
  box.y + Math.min(box.height, 40) <= viewport.height &&
  box.y >= 0;

await page.screenshot({ path: `${OUT}/audit-docs-keyboard-sim-390.png`, fullPage: false });

const exportPdf = page.getByRole("button", { name: /Export PDF/i }).first();
const exportVisible = await exportPdf.isVisible();

report.steps.push({
  name: "keyboard-sim-export-reachable",
  box,
  viewport,
  visibleInViewport: Boolean(visible),
  exportVisible,
  ok: Boolean(visible && exportVisible),
});

const failed = report.steps.filter((s) => !s.ok);
console.log(JSON.stringify(report, null, 2));
await browser.close();
if (failed.length) {
  console.error("MOBILE_KEYBOARD_AUDIT_FAILED", failed);
  process.exit(1);
}
console.log("MOBILE_KEYBOARD_AUDIT_OK");
