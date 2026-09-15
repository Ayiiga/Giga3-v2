import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("GigaSocial navigation — no duplicate bottom bars", () => {
  it("uses inline context nav instead of a fixed bottom dock", () => {
    const client = readFileSync(
      resolve(__dirname, "../../web/components/gigasocial/GigaSocialClient.tsx"),
      "utf8"
    );
    const contextNav = readFileSync(
      resolve(__dirname, "../../web/components/gigasocial/ux/GigaSocialContextNav.tsx"),
      "utf8"
    );
    const premiumCss = readFileSync(
      resolve(__dirname, "../../web/styles/gigasocial-premium.css"),
      "utf8"
    );

    expect(client).toContain("GigaSocialContextNav");
    expect(client).not.toContain("GigaSocialBottomDock");
    expect(contextNav).toContain("gigasocial-context-nav");
    expect(contextNav).not.toMatch(/position:\s*fixed/);
    expect(premiumCss).not.toContain(".gigasocial-bottom-dock");
    expect(premiumCss).toContain(".gigasocial-context-nav");
  });

  it("reserves padding for global primary nav only", () => {
    const css = readFileSync(
      resolve(__dirname, "../../web/styles/primary-nav.css"),
      "utf8"
    );

    expect(css).not.toContain(".gigasocial-bottom-dock");
    expect(css).toContain("var(--primary-nav-offset)");
    expect(css).toContain(".gigasocial-client-main");
  });
});
