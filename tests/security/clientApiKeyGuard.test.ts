import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const WEB_ROOT = join(process.cwd(), "web");

function walk(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "out") {
        continue;
      }
      files.push(...walk(full));
      continue;
    }
    if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

describe("client bundle secret guard", () => {
  it("does not expose search API keys in web client code", () => {
    const forbidden = [
      "SERPER_API_KEY",
      "BRAVE_SEARCH_API_KEY",
      "process.env.SERPER",
      "process.env.BRAVE_SEARCH",
    ];
    const hits: string[] = [];
    for (const file of walk(WEB_ROOT)) {
      const content = readFileSync(file, "utf8");
      for (const token of forbidden) {
        if (content.includes(token)) hits.push(`${file}: ${token}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
