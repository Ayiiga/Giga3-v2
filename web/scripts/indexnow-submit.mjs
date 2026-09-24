#!/usr/bin/env node
/**
 * Submit changed public URLs to IndexNow after a Cloudflare Pages deploy.
 * No-op when INDEXNOW_KEY is unset or nothing public changed.
 * The key is an ownership token hosted at /{key}.txt. It is not printed.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CANONICAL_HOST, CANONICAL_ORIGIN, canonicalLoc } from "./seo-route-policy.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pendingPath = path.resolve(__dirname, "../.indexnow-pending.json");

function key() {
  const value = process.env.INDEXNOW_KEY?.trim() ?? "";
  return /^[A-Za-z0-9-]{8,128}$/.test(value) ? value : "";
}

async function main() {
  const ownershipKey = key();
  if (!ownershipKey) {
    console.log("indexnow: INDEXNOW_KEY unset — skipping notification");
    return;
  }
  if (!existsSync(pendingPath)) {
    console.log("indexnow: no pending public URL changes");
    return;
  }
  const pending = JSON.parse(readFileSync(pendingPath, "utf8"));
  const urlList = [...new Set((pending.urls ?? []).map((url) => canonicalLoc(url)).filter(Boolean))];
  if (!urlList.length) {
    console.log("indexnow: no public URL changes to submit");
    return;
  }
  const body = {
    host: CANONICAL_HOST,
    key: ownershipKey,
    keyLocation: `${CANONICAL_ORIGIN}/${ownershipKey}.txt`,
    urlList: urlList.slice(0, 10000),
  };
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  console.log(`indexnow: submitted ${body.urlList.length} public urls, status ${response.status}`);
  if (!response.ok && response.status !== 202) {
    console.error("indexnow: notification was not accepted; deploy is unchanged");
  }
}

main().catch((err) => {
  console.error("indexnow: notification failed", err instanceof Error ? err.message : "request failed");
  process.exitCode = 1;
});
