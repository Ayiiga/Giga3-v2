#!/usr/bin/env node
/** Validate the exact offline HTML shipped by Cloudflare Pages and the installed PWA. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const source = read("public/offline.html");
const exported = read("out/offline.html");
const bundled = read("functions/offlinePageHtml.js");
const sw = read("public/sw.js");

assert.equal(exported, source, "Static export contains a stale or missing offline.html");
assert.equal(
  bundled,
  "/** PWA offline shell — keep in sync with web/public/offline.html (enforced by tests). */\n" +
    "export const OFFLINE_PAGE_HTML = " + JSON.stringify(source) + ";\n",
  "Cloudflare middleware contains a different offline.html body"
);
assert.match(source, /__giga3_connectivity_probe=/, "Offline shell must use origin connectivity probe");
assert.match(source, /RETRY_MS = 10000/, "Retry interval must remain 10 seconds");
assert.match(sw, /url\.searchParams\.has\("__giga3_connectivity_probe"\)/, "SW must bypass cache for origin probe");
assert.match(sw, /CACHE_VERSION = "giga3-v135"/, "SW cache generation must be updated");
console.log("Verified: exported offline.html, Cloudflare HTML bundle, origin probe, 10s retry, SW refresh");
