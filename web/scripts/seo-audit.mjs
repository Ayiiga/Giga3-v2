#!/usr/bin/env node
/**
 * Static SEO audit over the exported site (web/out).
 *
 * Checks every HTML page for: <title>, meta description, canonical, robots,
 * a single <h1>, Open Graph basics, valid JSON-LD, and <html lang>. Flags
 * duplicate titles / descriptions / canonicals across indexable pages and
 * cross-checks sitemap.xml against the pages that actually exist.
 *
 * Usage: node scripts/seo-audit.mjs [--out out] [--json report.json]
 * Exit code 1 when any error-level issue is found (warnings do not fail).
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const args = process.argv.slice(2);
const outDir = resolve(args.includes("--out") ? args[args.indexOf("--out") + 1] : "out");
const jsonPath = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;
const SITE = "https://www.giga3ai.com";

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "_next") continue;
      walk(full, acc);
    } else if (entry === "index.html" || (entry.endsWith(".html") && !entry.startsWith("_"))) {
      acc.push(full);
    }
  }
  return acc;
}

function decode(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}=["']([^"']*)["']`, "i"));
  return m ? decode(m[1]) : null;
}

function metaContent(html, key, value) {
  const re = new RegExp(`<meta[^>]*\\s${key}=["']${value}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  return tag ? attr(tag, "content") : null;
}

function routeOf(file) {
  const rel = relative(outDir, file).replace(/\\/g, "/");
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) return `/${rel.slice(0, -"/index.html".length)}/`;
  return `/${rel.replace(/\.html$/, "")}`;
}

const pages = walk(outDir).map((file) => {
  const html = readFileSync(file, "utf8");
  const route = routeOf(file);
  const title = decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "").trim();
  const description = metaContent(html, "name", "description");
  const canonical = (() => {
    const tag = html.match(/<link[^>]*rel=["']canonical["'][^>]*>/i)?.[0];
    return tag ? attr(tag, "href") : null;
  })();
  const robots = metaContent(html, "name", "robots") ?? "";
  const noindex = /noindex/i.test(robots);
  const h1s = [...html.matchAll(/<h1[\s>]/gi)].length;
  const ogTitle = metaContent(html, "property", "og:title");
  const ogDescription = metaContent(html, "property", "og:description");
  const ogImage = metaContent(html, "property", "og:image");
  const lang = attr(html.match(/<html[^>]*>/i)?.[0] ?? "", "lang");
  const jsonLd = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(
    (m) => {
      try {
        const parsed = JSON.parse(m[1]);
        return { ok: true, type: parsed["@type"] ?? null };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }
  );
  return {
    route,
    title,
    description,
    canonical,
    robots,
    noindex,
    h1s,
    ogTitle,
    ogDescription,
    ogImage,
    lang,
    jsonLd,
  };
});

const errors = [];
const warnings = [];
const err = (route, msg) => errors.push({ route, msg });
const warn = (route, msg) => warnings.push({ route, msg });

const indexable = pages.filter((p) => !p.noindex && p.route !== "/404/" && p.route !== "/404");

for (const p of pages) {
  const isNotFound = p.route === "/404" || p.route === "/404/";
  if (!p.lang) err(p.route, "missing <html lang>");
  if (!p.title) err(p.route, "missing <title>");
  for (const block of p.jsonLd) {
    if (!block.ok) err(p.route, `invalid JSON-LD: ${block.error}`);
  }
  if (p.noindex || isNotFound) continue;

  if (!p.description) err(p.route, "missing meta description");
  else if (p.description.length < 50) warn(p.route, `short meta description (${p.description.length} chars)`);
  else if (p.description.length > 165) warn(p.route, `long meta description (${p.description.length} chars)`);
  if (p.title.length > 70) warn(p.route, `long <title> (${p.title.length} chars)`);
  if (!p.canonical) err(p.route, "missing canonical");
  else {
    const expected = `${SITE}${p.route}`;
    if (p.canonical !== expected) {
      err(p.route, `canonical ${p.canonical} does not match route (${expected})`);
    }
  }
  if (p.h1s === 0) err(p.route, "no <h1>");
  else if (p.h1s > 1) err(p.route, `${p.h1s} <h1> elements`);
  if (!p.ogTitle || !p.ogDescription) warn(p.route, "missing og:title/og:description");
  if (!p.ogImage) warn(p.route, "missing og:image");
}

function dupes(list, key, label) {
  const seen = new Map();
  for (const p of list) {
    const v = p[key];
    if (!v) continue;
    seen.set(v, [...(seen.get(v) ?? []), p.route]);
  }
  for (const [v, routes] of seen) {
    if (routes.length > 1) err(routes.join(" , "), `duplicate ${label}: "${v.slice(0, 80)}"`);
  }
}
dupes(indexable, "title", "<title>");
dupes(indexable, "description", "meta description");
dupes(indexable, "canonical", "canonical");

// Sitemap consistency.
let sitemapLocs = [];
try {
  const xml = readFileSync(join(outDir, "sitemap.xml"), "utf8");
  sitemapLocs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
} catch {
  err("/sitemap.xml", "sitemap.xml missing from build output");
}
const routeSet = new Set(pages.map((p) => p.route));
const indexableSet = new Set(indexable.map((p) => p.route));
for (const loc of sitemapLocs) {
  if (!loc.startsWith(SITE)) {
    err("/sitemap.xml", `sitemap loc not on canonical host: ${loc}`);
    continue;
  }
  const route = loc.slice(SITE.length) || "/";
  if (!routeSet.has(route)) err("/sitemap.xml", `sitemap lists ${route} but no page was built`);
  else if (!indexableSet.has(route)) err("/sitemap.xml", `sitemap lists noindex page ${route}`);
}
const sitemapRoutes = new Set(sitemapLocs.map((l) => l.slice(SITE.length) || "/"));
for (const p of indexable) {
  if (!sitemapRoutes.has(p.route)) warn(p.route, "indexable page not listed in sitemap.xml");
}

// robots.txt sanity.
try {
  const robots = readFileSync(join(outDir, "robots.txt"), "utf8");
  if (!/Sitemap:\s*https:\/\/www\.giga3ai\.com\/sitemap\.xml/.test(robots)) {
    err("/robots.txt", "robots.txt does not reference sitemap.xml");
  }
  const disallows = [...robots.matchAll(/^Disallow:\s*(\S+)/gim)].map((m) => m[1]);
  for (const route of sitemapRoutes) {
    if (disallows.some((d) => route.startsWith(d))) {
      err("/robots.txt", `sitemap route ${route} is blocked by Disallow`);
    }
  }
} catch {
  err("/robots.txt", "robots.txt missing from build output");
}

const report = {
  pages: pages.length,
  indexable: indexable.length,
  noindex: pages.filter((p) => p.noindex).length,
  sitemapEntries: sitemapLocs.length,
  errors,
  warnings,
};
if (jsonPath) writeFileSync(jsonPath, JSON.stringify({ ...report, detail: pages }, null, 2));

console.log(
  `SEO audit: ${report.pages} pages (${report.indexable} indexable, ${report.noindex} noindex), ${report.sitemapEntries} sitemap entries`
);
for (const w of warnings) console.log(`  warn  ${w.route} — ${w.msg}`);
for (const e of errors) console.log(`  ERROR ${e.route} — ${e.msg}`);
console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
