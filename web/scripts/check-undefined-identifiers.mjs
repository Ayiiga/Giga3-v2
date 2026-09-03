#!/usr/bin/env node
/**
 * Build guard: `next build` ignores TypeScript errors, so a missing import
 * (TS2304 "Cannot find name") ships as a runtime ReferenceError. This turns
 * exactly that class of error into a build failure without blocking on the
 * repo's long tail of other type debt.
 */
import { spawnSync } from "node:child_process";

const tsc = spawnSync("npx", ["tsc", "--noEmit", "-p", "tsconfig.json", "--pretty", "false"], {
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
const out = `${tsc.stdout ?? ""}${tsc.stderr ?? ""}`;
const undefinedNames = out
  .split("\n")
  .filter((line) => /error TS2304:/.test(line) && !line.startsWith("../convex/"));

if (undefinedNames.length) {
  console.error("Undefined identifiers in web/ (would be runtime ReferenceErrors):");
  for (const line of undefinedNames) console.error("  " + line);
  process.exit(1);
}
console.log("check-undefined-identifiers: OK (no TS2304 in web/)");
