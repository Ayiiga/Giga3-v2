#!/usr/bin/env node
/**
 * Build GitHub Actions step summary from Playwright JSON results.
 * Usage: node scripts/production-e2e-summary.mjs [results.json]
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const resultsPath = resolve(process.argv[2] ?? "playwright-report/results.json");
const baseUrl = process.env.GIGA3_E2E_BASE_URL ?? "https://www.giga3ai.com";
const commit = process.env.GITHUB_SHA?.slice(0, 7) ?? "local";
const timestamp = new Date().toISOString();

function categoryFor(suiteTitles, file) {
  const joined = suiteTitles.join(" ").toLowerCase();
  const base = (file ?? "").toLowerCase();

  if (base.includes("production-public-routes")) return "Public smoke";
  if (base.includes("production-service-worker")) return "Service worker";
  if (base.includes("production-paystack")) return "Paystack-safe";
  if (base.includes("production-seo")) return "SEO/indexability";
  if (base.includes("production-gigalearn")) return "GigaLearn";
  if (joined.includes("unauthenticated") || joined.includes("production smoke")) return "Public smoke";
  if (joined.includes("authenticated")) return "Authenticated";
  if (base.includes("verified-release-410")) return "Release 410 (chat)";
  return "Other";
}

function walkSuites(suites, ancestors = [], file = "") {
  const rows = [];
  for (const suite of suites ?? []) {
    const titles = [...ancestors, suite.title].filter(Boolean);
    for (const spec of suite.specs ?? []) {
      const specFile = spec.file ?? file;
      for (const test of spec.tests ?? []) {
        const results = test.results ?? [];
        const result = results[results.length - 1];
        if (!result) continue;
        rows.push({
          category: categoryFor(titles, specFile),
          title: [...titles, spec.title].filter(Boolean).join(" › "),
          file: specFile,
          project: test.projectName ?? "unknown",
          status: result.status ?? "unknown",
          duration: results.reduce((sum, r) => sum + (r.duration ?? 0), 0),
          error: result.error?.message ?? result.errors?.[0]?.message ?? null,
        });
      }
    }
    rows.push(...walkSuites(suite.suites, titles, file));
  }
  return rows;
}

function summarizeCategory(rows, name) {
  const subset = rows.filter((r) => r.category === name);
  if (subset.length === 0) return "NOT TESTED";
  const passed = subset.filter((r) => r.status === "passed").length;
  const failed = subset.filter((r) => r.status === "failed").length;
  const skipped = subset.filter((r) => r.status === "skipped").length;
  if (failed > 0) return `FAIL (${passed} pass, ${failed} fail, ${skipped} skip)`;
  if (passed > 0 && skipped === 0) return `PASS (${passed})`;
  if (passed > 0 && skipped > 0) return `PASS (${passed} pass, ${skipped} skipped)`;
  if (skipped > 0 && passed === 0 && failed === 0) return `SKIPPED (${skipped})`;
  return "NOT TESTED";
}

function statusEmoji(status) {
  if (status === "passed") return "PASS";
  if (status === "failed") return "FAIL";
  if (status === "skipped") return "SKIPPED";
  if (status === "timedOut") return "FAIL (timeout)";
  return status.toUpperCase();
}

let rows = [];
if (existsSync(resultsPath)) {
  const json = JSON.parse(readFileSync(resultsPath, "utf8"));
  rows = walkSuites(json.suites ?? []);
} else {
  console.warn(`Playwright JSON not found at ${resultsPath}`);
}

const passed = rows.filter((r) => r.status === "passed").length;
const failed = rows.filter((r) => r.status === "failed" || r.status === "timedOut").length;
const skipped = rows.filter((r) => r.status === "skipped").length;
const durationMs = rows.reduce((sum, r) => sum + r.duration, 0);
const failing = rows.filter((r) => r.status === "failed" || r.status === "timedOut");

const authConfigured = Boolean(
  process.env.GIGA3_E2E_EMAIL?.trim() && process.env.GIGA3_E2E_PASSWORD
);

const lines = [
  "## Production E2E Verification",
  "",
  "| Field | Value |",
  "|-------|-------|",
  `| Production URL | ${baseUrl} |`,
  `| Commit tested | \`${commit}\` |`,
  `| Timestamp (UTC) | ${timestamp} |`,
  `| Public smoke result | ${summarizeCategory(rows, "Public smoke")} |`,
  `| Authenticated result | ${authConfigured ? summarizeCategory(rows, "Authenticated") : "SKIPPED — GIGA3_E2E_EMAIL/GIGA3_E2E_PASSWORD not configured."} |`,
  `| Paystack-safe result | ${summarizeCategory(rows, "Paystack-safe")} |`,
  `| GigaLearn result | ${authConfigured ? summarizeCategory(rows, "GigaLearn") : "SKIPPED — credentials not configured."} |`,
  `| SEO/indexability result | ${summarizeCategory(rows, "SEO/indexability")} |`,
  `| Service-worker result | ${summarizeCategory(rows, "Service worker")} |`,
  `| Release 410 (chat) | ${summarizeCategory(rows, "Release 410 (chat)")} |`,
  `| **Total passed** | **${passed}** |`,
  `| **Total failed** | **${failed}** |`,
  `| **Total skipped** | **${skipped}** |`,
  `| Duration | ${(durationMs / 1000).toFixed(1)}s |`,
  "",
  "### Indexing distinction",
  "",
  "| Layer | Status |",
  "|-------|--------|",
  `| Technical SEO readiness | ${summarizeCategory(rows, "SEO/indexability")} (live robots/sitemap/canonical/JSON-LD) |`,
  "| Google Search Console verification | NOT TESTED (no token supplied) |",
  "| Bing Webmaster verification | NOT TESTED (no token supplied) |",
  "| Actual search-engine indexing | NOT TESTED (requires Search Console/Webmaster data) |",
  "",
];

if (failing.length) {
  lines.push("### Failing tests", "");
  for (const row of failing) {
    lines.push(`- **${statusEmoji(row.status)}** \`${row.project}\` — ${row.title}`);
    if (row.error) lines.push(`  - ${row.error.split("\n")[0]}`);
  }
  lines.push("");
}

const projects = [...new Set(rows.map((r) => r.project))];
lines.push("### Projects", "", projects.map((p) => `- ${p}`).join("\n"), "");

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
const body = lines.join("\n");
if (summaryPath) {
  const { appendFileSync } = await import("node:fs");
  appendFileSync(summaryPath, body);
}
console.log(body);

process.exit(failed > 0 ? 1 : 0);
