import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const WEB_ROOT = resolve(__dirname, "../../web");

describe("account routes (chat overflow menu targets)", () => {
  it("exports profile, settings, and help pages", () => {
    for (const segment of ["profile", "settings", "help"]) {
      expect(existsSync(resolve(WEB_ROOT, `app/(marketing)/${segment}/page.tsx`))).toBe(true);
    }
  });

  it("ChatMoreMenu uses hard-stable links to account pages and legal privacy", () => {
    const more = readFileSync(
      resolve(WEB_ROOT, "components/chat/ChatMoreMenu.tsx"),
      "utf8"
    );
    expect(more).toContain('href="/profile/"');
    expect(more).toContain('href="/settings/"');
    expect(more).toContain('href="/help/"');
    expect(more).toContain('href="/legal/privacy/"');
    expect(more).not.toContain('href="/privacy"');
    expect(more).toContain("hard");
  });

  it("404 page uses hard StableLink navigation", () => {
    const notFound = readFileSync(resolve(WEB_ROOT, "app/not-found.tsx"), "utf8");
    expect(notFound).toContain("StableLink");
    expect(notFound).toContain("hard");
    expect(notFound).not.toContain("ButtonLink");
  });
});
