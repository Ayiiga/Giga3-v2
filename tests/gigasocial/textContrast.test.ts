import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("GigaSocial navy text contrast", () => {
  const css = readFileSync(
    resolve(__dirname, "../../web/styles/gigasocial-premium.css"),
    "utf8"
  );

  it("paints foreground and muted copy with the light navy tokens", () => {
    expect(css).toContain(".gigasocial-premium .text-foreground");
    expect(css).toContain("color: var(--gs-text) !important");
    expect(css).toContain(".gigasocial-premium .text-muted");
    expect(css).toContain("color: var(--gs-muted) !important");
    expect(css).toContain("--gs-text: #ffffff");
    expect(css).toContain("--gs-muted: #94a3b8");
  });

  it("keeps selected mobile chips off the marketing near-white wash", () => {
    expect(css).toContain('.marketing-stable .gigasocial-premium [class*="bg-accent/10"]');
    expect(css).toContain("background-color: rgba(59, 130, 246, 0.22) !important");
  });
});
