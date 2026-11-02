#!/usr/bin/env node
/**
 * Fail the production build if a published blog article is missing from the
 * static export or the blog sitemap points at a non-exported/unknown route.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "out");
const registryPath = path.join(root, "lib/blog/postRegistry.ts");
const sitemapPath = path.join(root, "public/sitemap-blog.xml");
const origin = "https://www.giga3ai.com";

function fail(message) {
  console.error("verify-blog-static-export: ERROR: " + message);
  process.exitCode = 1;
}

if (!existsSync(out)) {
  fail("web/out does not exist; run after next build");
  process.exit();
}

const registry = readFileSync(registryPath, "utf8");
const slugs = [...registry.matchAll(/slug:\s*"([^"]+)"/g)].map((match) => match[1]);
if (!slugs.length) fail("no article slugs found in postRegistry.ts");
if (new Set(slugs).size !== slugs.length) fail("duplicate article slugs in postRegistry.ts");

const sitemap = readFileSync(sitemapPath, "utf8");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const articleLocs = locs.filter((loc) => {
  let url;
  try {
    url = new URL(loc);
  } catch {
    fail("sitemap contains an invalid URL: " + loc);
    return false;
  }
  if (url.pathname === "/blog/" || url.pathname.startsWith("/blog/category/")) return false;
  return url.pathname.startsWith("/blog/");
});

for (const slug of slugs) {
  const html = path.join(out, "blog", slug, "index.html");
  if (!existsSync(html)) fail("published article has no static export: /blog/" + slug + "/ (" + html + ")");
  const canonical = origin + "/blog/" + slug + "/";
  if (!locs.includes(canonical)) fail("published article missing from sitemap-blog.xml: " + canonical);
}

const seen = new Set();
for (const loc of articleLocs) {
  let url;
  try {
    url = new URL(loc);
  } catch {
    continue;
  }
  const match = url.pathname.match(/^\/blog\/([^/]+)\/$/);
  if (url.origin !== origin || !match) {
    fail("sitemap contains a non-canonical or malformed article URL: " + loc);
    continue;
  }
  const slug = match[1];
  if (seen.has(slug)) fail("sitemap contains a duplicate article URL: " + loc);
  seen.add(slug);
  if (!slugs.includes(slug)) fail("sitemap contains unknown article URL: " + loc);
  if (!existsSync(path.join(out, "blog", slug, "index.html"))) {
    fail("sitemap article has no static export: /blog/" + slug + "/");
  }
}

if (seen.size !== slugs.length) {
  fail("sitemap article count " + seen.size + " does not match registry count " + slugs.length);
}

if (process.exitCode) process.exit(process.exitCode);
console.log("verify-blog-static-export: OK — " + slugs.length + " published articles have exported HTML and canonical sitemap entries");
