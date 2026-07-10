import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(root, "..", "out");
const workerDest = path.join(outDir, "_worker.js");

if (!existsSync(outDir)) {
  console.warn("No web/out directory — skipping Pages edge cleanup");
  process.exit(0);
}

if (existsSync(workerDest)) {
  rmSync(workerDest);
  console.log("Removed out/_worker.js — using web/functions middleware instead");
}

mkdirSync(outDir, { recursive: true });
