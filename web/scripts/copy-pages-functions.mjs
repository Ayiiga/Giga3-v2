import { cpSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, "..", "functions");
const dest = path.join(root, "..", "out", "functions");

if (!existsSync(src)) {
  console.warn("No web/functions directory — skipping Pages Functions copy");
  process.exit(0);
}

cpSync(src, dest, { recursive: true });
console.log("Copied Cloudflare Pages Functions to out/functions");
