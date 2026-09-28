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

  it("404 page uses client recovery with POST log-404", () => {
    const notFound = readFileSync(resolve(WEB_ROOT, "components/seo/NotFoundClient.tsx"), "utf8");
    expect(notFound).toContain("NotFoundClient");
    expect(notFound).toContain('method: "POST"');
    expect(notFound).toContain("/api/log-404");
    expect(notFound).toContain("Go to home page");
    expect(notFound).toContain("Browse all features");
    expect(notFound).toContain('"/gigalearn"');
    expect(notFound).toContain('"/gigasocial"');
    expect(notFound).toContain('"/media"');
    expect(notFound).toContain('"/chat"');
  });
});
