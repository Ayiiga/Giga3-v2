#!/usr/bin/env node
/**
 * Drop sitemap entries that were not exported to web/out (static build).
 * Prebuild sitemaps can list Convex profiles/posts that fail SSG — seo:audit fails deploy.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const outDir = resolve(__dirname, "../out");
const SITE = "https://www.giga3ai.com";

function routeHasBuiltPage(route) {
  if (route === "/") return existsSync(join(outDir, "index.html"));
  const trimmed = route.replace(/^\//, "").replace(/\/$/, "");
  return existsSync(join(outDir, trimmed, "index.html"));
}

function filterUrlset(filePath) {
  if (!existsSync(filePath)) return 0;
  const xml = readFileSync(filePath, "utf8");
  const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)];
  if (!entries.length) return 0;

  const kept = [];
  let dropped = 0;

  for (const match of entries) {
    const block = match[1];
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim();
    if (!loc?.startsWith(SITE)) {
      kept.push(match[0]);
      continue;
    }
    const route = loc.slice(SITE.length) || "/";
    if (routeHasBuiltPage(route)) {
      kept.push(match[0]);
    } else {
      dropped += 1;
      console.log(`filter-sitemap-built-pages: dropped ${route} (no static export)`);
    }
  }

  if (!dropped) return 0;

  const header = xml.match(/^[\s\S]*?<urlset[^>]*>\n?/)?.[0] ?? '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  const footer = "\n</urlset>\n";
  writeFileSync(filePath, `${header}${kept.join("\n")}${footer}`, "utf8");
  return dropped;
}

function main() {
  if (!existsSync(outDir)) {
    console.warn("filter-sitemap-built-pages: out/ missing — skip");
    return;
  }

  let total = 0;
  for (const name of ["sitemap-gigasocial.xml", "sitemap-marketplace.xml"]) {
    total += filterUrlset(join(outDir, name));
  }

  if (total) {
    console.log(`filter-sitemap-built-pages: removed ${total} unbuilt url(s)`);
  } else {
    console.log("filter-sitemap-built-pages: all dynamic sitemap entries have static pages");
  }
}

main();
