import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(root, "..", "out");
const workerSrc = path.join(root, "..", "edge", "social-og-worker.js");
const workerDest = path.join(outDir, "_worker.js");

if (!existsSync(outDir)) {
  console.warn("No web/out directory — skipping Pages worker copy");
  process.exit(0);
}

if (!existsSync(workerSrc)) {
  console.warn("Missing web/edge/social-og-worker.js — skipping Pages worker copy");
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });
cpSync(workerSrc, workerDest);
console.log("Copied Cloudflare Pages worker to out/_worker.js");
