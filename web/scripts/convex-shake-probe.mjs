/**
 * Headless A/B probe: compare render + Convex metrics with/without queries.
 * Usage: node scripts/convex-shake-probe.mjs
 */
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "out");
const BASE = process.env.PROBE_BASE ?? "http://127.0.0.1:8765";
const EMAIL = "probe@giga3.test";
const SOAK_MS = Number(process.env.PROBE_SOAK_MS ?? 45_000);

const SCENARIOS = [
  {
    name: "baseline (queries on)",
    query: "convexProbe=1&renderProbe=1",
  },
  {
    name: "noConvexQueries",
    query: "convexProbe=1&renderProbe=1&noConvexQueries=1",
  },
  {
    name: "noConvexClient",
    query: "convexProbe=1&renderProbe=1&noConvexClient=1&noConvexQueries=1",
  },
];

async function soak(page, label) {
  await page.waitForTimeout(SOAK_MS);
  const render = await page.evaluate(() => window.__giga3RenderCounts ?? {});
  const convex = await page.evaluate(() => window.__giga3ConvexProbe ?? null);
  const rows = Object.entries(render).sort((a, b) => b[1] - a[1]);
  console.log(`\n=== ${label} (${SOAK_MS / 1000}s soak) ===`);
  console.log("Top renders:", rows.slice(0, 10));
  console.log("Convex probe:", JSON.stringify(convex, null, 2));
  const totalRenders = rows.reduce((s, [, n]) => s + n, 0);
  return { totalRenders, convex, top: rows.slice(0, 5) };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const scenario of SCENARIOS) {
    const context = await browser.newContext();
    await context.addInitScript((email) => {
      localStorage.setItem("giga3_user_email", email);
    }, EMAIL);

    const page = await context.newPage();
    page.on("console", (msg) => {
      const t = msg.text();
      if (t.includes("[giga3-convex]") || t.includes("[giga3-render]")) {
        console.log(`[browser] ${t.slice(0, 200)}`);
      }
    });

    const url = `${BASE}/media/?${scenario.query}`;
    console.log(`\nNavigating: ${url}`);
    await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
    const summary = await soak(page, scenario.name);
    results.push({ scenario: scenario.name, ...summary });
    await context.close();
  }

  await browser.close();

  console.log("\n=== SUMMARY ===");
  for (const r of results) {
    console.log(
      `${r.scenario}: totalRenders=${r.totalRenders} queryUpdates=${r.convex?.lastMinute?.queryUpdates ?? "n/a"} reconnects=${r.convex?.reconnectsPerMinute ?? "n/a"}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
