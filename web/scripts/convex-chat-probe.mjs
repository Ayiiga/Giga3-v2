import { chromium } from "playwright";

const BASE = process.env.PROBE_BASE ?? "http://127.0.0.1:8765";
const EMAIL = "probe@giga3.test";
const SOAK_MS = Number(process.env.PROBE_SOAK_MS ?? 35_000);

const SCENARIOS = [
  { name: "chat baseline", query: "convexProbe=1&renderProbe=1" },
  { name: "chat noConvexQueries", query: "convexProbe=1&renderProbe=1&noConvexQueries=1" },
];

async function soak(page, label) {
  await page.waitForTimeout(SOAK_MS);
  const render = await page.evaluate(() => window.__giga3RenderCounts ?? {});
  const convex = await page.evaluate(() => window.__giga3ConvexProbe ?? null);
  const rows = Object.entries(render).sort((a, b) => b[1] - a[1]);
  console.log(`\n=== ${label} ===`);
  console.log("Top renders:", rows.slice(0, 12));
  console.log("Convex:", convex);
  return { totalRenders: rows.reduce((s, [, n]) => s + n, 0), convex, rows };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  for (const scenario of SCENARIOS) {
    const ctx = await browser.newContext();
    await ctx.addInitScript((email) => {
      localStorage.setItem("giga3_user_email", email);
    }, EMAIL);
    const page = await ctx.newPage();
    page.on("console", (msg) => {
      const t = msg.text();
      if (t.includes("[giga3-convex]") || t.includes("[giga3-render]")) {
        console.log(`[browser] ${t.slice(0, 180)}`);
      }
    });
    await page.goto(`${BASE}/chat/?${scenario.query}`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await soak(page, scenario.name);
    await ctx.close();
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
