#!/usr/bin/env node
/**
 * CI/build guard: required chat overflow containment rules must exist in CSS.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const css = ["../styles/globals.css", "../styles/chat-overflow.css"]
  .map((rel) => fs.readFileSync(path.join(root, rel), "utf8"))
  .join("\n");

const required = [
  "overflow-x: hidden",
  "width: 100%",
  "word-break: break-word",
  "overflow-wrap: anywhere",
  "white-space: pre-wrap",
  "chat-md-table-wrap",
  "chat-md-pre",
  "max-width: 100%",
  "height: auto",
  "min-width: 0",
];

const missing = required.filter((token) => !css.includes(token));
if (missing.length > 0) {
  console.error("verify-chat-overflow-css: missing rules:", missing.join(", "));
  process.exit(1);
}

console.log("verify-chat-overflow-css: ok");
