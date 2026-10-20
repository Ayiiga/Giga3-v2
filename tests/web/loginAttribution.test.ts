import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("login page brand attribution", () => {
  it("shows A product of GIGA without the founder personal name", () => {
    const login = read("web/components/chat/ChatLoginForm.tsx");
    expect(login).toContain("A product of {siteConfig.founder.organizationShort}");
    expect(login).not.toContain("Founded by");
    expect(login).not.toContain("siteConfig.founder.name");

    const site = read("web/lib/site.ts");
    expect(site).toContain('organizationShort: "GIGA"');
  });

  it("does not repeat the old attribution string elsewhere in auth UI", () => {
    const login = read("web/components/chat/ChatLoginForm.tsx");
    expect(login).not.toMatch(/Founded by\s*\{/);
    expect(login).not.toContain("Ayiiga Benard Issaka");
  });
});
