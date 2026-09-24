#!/usr/bin/env node
/**
 * Write the IndexNow ownership file into the static export.
 * The file content is the key itself, which IndexNow requires to be public.
 * The key is never written into JS bundles.
 */
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../out");
const key = process.env.INDEXNOW_KEY?.trim() ?? "";

if (!existsSync(outDir)) {
  console.log("indexnow: no out/ directory — skipping key file");
  process.exit(0);
}

if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) {
  console.log("indexnow: INDEXNOW_KEY unset — ownership file not generated");
  process.exit(0);
}

writeFileSync(path.join(outDir, `${key}.txt`), `${key}\n`, "utf8");
console.log("indexnow: wrote ownership key file into out/");
