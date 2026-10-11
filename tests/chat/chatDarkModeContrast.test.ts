import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("chat dark mode contrast", () => {
  const css = readFileSync(resolve(__dirname, "../../web/styles/globals.css"), "utf8");

  it("defines dark theme tokens with dark surfaces and light foreground", () => {
    expect(css).toMatch(/\.dark\s*\{[^}]*--background:\s*#0c0c0f/s);
    expect(css).toMatch(/\.dark\s*\{[^}]*--foreground:\s*#f4f4f5/s);
    expect(css).toMatch(/\.dark\s*\{[^}]*--card:\s*#18181b/s);
  });

  it("remaps hardcoded light chat surfaces under html.dark .chat-stable", () => {
    expect(css).toContain("html.dark .chat-stable .bg-white");
    expect(css).toContain("background-color: var(--card)");
    expect(css).toContain("html.dark .chat-stable .text-black");
    expect(css).toContain("color: var(--foreground)");
    expect(css).toMatch(/html\.dark \.chat-stable \.bg-\\\[\\#F3F4F6\\\]/);
    expect(css).toMatch(/html\.dark \.chat-stable \.border-\\\[\\#E5E7EB\\\]/);
    // Yellow CTAs keep dark text for contrast on #EAB308
    expect(css).toMatch(/html\.dark \.chat-stable \.bg-\\\[\\#EAB308\\\]/);
    expect(css).toContain("color: #0a0a0a");
  });
});
