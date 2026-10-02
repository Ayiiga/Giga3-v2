import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";

const CACHE_VERSION_RE = /CACHE_VERSION\s*=\s*"([^"]+)"/;

export function readRepoCacheVersion(): string {
  const sw = readFileSync(resolve(__dirname, "../../../web/public/sw.js"), "utf8");
  return sw.match(CACHE_VERSION_RE)?.[1] ?? "";
}

export async function readLiveCacheVersion(page: Page): Promise<string | null> {
  return page.evaluate(async () => {
    const res = await fetch("/sw.js", { cache: "no-store" });
    if (!res.ok) return null;
    const text = await res.text();
    return text.match(/CACHE_VERSION\s*=\s*"([^"]+)"/)?.[1] ?? null;
  });
}

export function shouldCompareRepoCacheVersion(): boolean {
  const flag = process.env.GIGA3_E2E_COMPARE_REPO_SW?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "no") return false;
  return true;
}
