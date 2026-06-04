/**
 * Render-frequency probe for /chat (requires dev server).
 * Usage: node scripts/measure-chat-renders.mjs [label]
 */
import { chromium } from "playwright";

const label = process.argv[2] ?? "run";
const base = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const dwellMs = Number(process.env.DWELL_MS ?? 8000);

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.addInitScript(() => {
    window.__renderCounts = {};
    window.__renderProbeLog = [];
  });

  await page.goto(`${base}/chat/login/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.setItem("giga3_user_email", "probe@example.com");
  });
  await page.goto(`${base}/chat/?renderProbe=1`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await page.waitForTimeout(dwellMs);

  const probeTable = await page.evaluate(() => {
    const counts = window.__giga3RenderCounts ?? {};
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  });

  console.log(`\n=== Render probe (${label}) — ${dwellMs}ms idle on /chat/ ===`);
  if (probeTable.length === 0) {
    console.log("(No in-app probe counts — ensure renderProbe is enabled)");
  } else {
    const total = probeTable.reduce((s, [, n]) => s + n, 0);
    console.log(`In-app probe renders: ${total}`);
    for (const [name, n] of probeTable) {
      console.log(`  ${name}: ${n}`);
    }
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
