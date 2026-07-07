#!/usr/bin/env node
/**
 * Verifies NEXT_PUBLIC_CONVEX_URL was baked into the static export.
 * Run after `npm run build` with the same env vars as CI.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "../out");
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.replace(
  /[\u200B-\u200D\uFEFF\u2060\u00AD]/g,
  ""
).trim();

const RETIRED_CONVEX_HOSTS = new Set(["happy-otter-123.convex.cloud"]);

if (convexUrl !== process.env.NEXT_PUBLIC_CONVEX_URL?.trim()) {
  console.warn(
    "verify-convex-in-build: NEXT_PUBLIC_CONVEX_URL contained invisible characters — they were stripped for verification."
  );
}

if (!convexUrl) {
  console.error(
    "verify-convex-in-build: NEXT_PUBLIC_CONVEX_URL is not set — cannot verify production bundle."
  );
  process.exit(1);
}

let host;
try {
  host = new URL(convexUrl).host;
} catch {
  console.error(`verify-convex-in-build: invalid NEXT_PUBLIC_CONVEX_URL: ${convexUrl}`);
  process.exit(1);
}

if (RETIRED_CONVEX_HOSTS.has(host)) {
  console.error(
    `verify-convex-in-build: build env points at retired Convex host "${host}". ` +
      "CI must remap to perfect-lark-521 before building."
  );
  process.exit(1);
}

if (!fs.existsSync(outDir)) {
  console.error(`verify-convex-in-build: missing output directory ${outDir}`);
  process.exit(1);
}

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walk(full, files);
    else if (/\.(js|html|json|txt)$/.test(name.name)) files.push(full);
  }
  return files;
}

const files = walk(outDir);
let hits = 0;
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  if (text.includes(host) || text.includes(convexUrl)) hits++;
}

if (hits === 0) {
  console.error(
    `verify-convex-in-build: no file under out/ contains Convex host "${host}". ` +
      "The client was likely built without NEXT_PUBLIC_CONVEX_URL."
  );
  process.exit(1);
}

console.log(
  `verify-convex-in-build: OK — found Convex deployment (${host}) in ${hits} file(s) under out/`
);
