import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("PrimaryNav UI wiring", () => {
  it("uses exact short labels and mounts from root layout", () => {
    const nav = readFileSync(
      resolve(__dirname, "../../web/lib/navigation/primaryNav.ts"),
      "utf8"
    );
    const component = readFileSync(
      resolve(__dirname, "../../web/components/navigation/PrimaryNav.tsx"),
      "utf8"
    );
    const layout = readFileSync(resolve(__dirname, "../../web/app/layout.tsx"), "utf8");

    expect(nav).toContain('label: "Home"');
    expect(nav).toContain('label: "GigaLearn"');
    expect(nav).toContain('label: "Create"');
    expect(nav).toContain('label: "Social"');
    expect(component).toContain("aria-current");
    expect(component).toContain("primary-nav__label");
    expect(layout).toContain("PrimaryNavHost");
    expect(layout).toContain("primary-nav.css");
  });

  it("stacks GigaSocial dock above global nav and hides during immersive edit", () => {
    const host = readFileSync(
      resolve(__dirname, "../../web/components/navigation/PrimaryNavHost.tsx"),
      "utf8"
    );
    const css = readFileSync(
      resolve(__dirname, "../../web/styles/primary-nav.css"),
      "utf8"
    );

    expect(host).toContain("gigaedit-video-mode");
    expect(host).toContain("chat-keyboard-open");
    expect(host).toContain("primary-nav-bar-visible");
    expect(css).toContain(".gigasocial-bottom-dock");
    expect(css).toContain("primary-nav-bar-visible");
    expect(css).toContain("padding-bottom: var(--primary-nav-offset)");
  });

  it("keeps PrimaryNav lightweight without heavy product bundle imports", () => {
    const nav = readFileSync(
      resolve(__dirname, "../../web/components/navigation/PrimaryNav.tsx"),
      "utf8"
    );
    const host = readFileSync(
      resolve(__dirname, "../../web/components/navigation/PrimaryNavHost.tsx"),
      "utf8"
    );
    expect(nav).not.toMatch(/from "@\/components\/(gigaedit|gigasocial|media)\//);
    expect(host).not.toMatch(/from "@\/components\/(gigaedit|gigasocial|media)\//);
    expect(nav).toContain('aria-label="Giga3 primary navigation"');
    expect(nav).toContain("primary-nav__label");
    expect(nav).toContain("PrimaryNavIcons");
  });
});
