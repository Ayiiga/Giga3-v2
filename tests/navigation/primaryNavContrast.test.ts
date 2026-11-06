import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolvePrimaryNavTab } from "../../web/lib/navigation/primaryNav";

const css = readFileSync(resolve(__dirname, "../../web/styles/primary-nav.css"), "utf8");
const globals = readFileSync(resolve(__dirname, "../../web/styles/globals.css"), "utf8");
const component = readFileSync(
  resolve(__dirname, "../../web/components/navigation/PrimaryNav.tsx"),
  "utf8"
);

describe("primary nav daylight contrast", () => {
  it("paints the active tab indigo with white text and a stable shadow", () => {
    expect(css).toContain("background: #6334c9");
    expect(css).toContain("color: #fff");
    expect(css).toContain("box-shadow: 0 5px 16px rgba(99, 52, 201, 0.28)");
    expect(css).toContain("font-weight: 800");
    expect(css).not.toContain("scale-105");
    expect(css).not.toContain("translateY(-0.5px)");
    expect(globals).toContain("background: #5b21b6 !important");
    expect(globals).toContain("color: #fff !important");
    expect(globals).toContain("z-index: 60 !important");
    expect(globals).not.toMatch(/primary-nav__item--active svg[\s\S]{0,180}color:\s*#7c3aed/);
  });

  it("uses a floating deep-navy pill with readable inactive tabs and uppercase labels", () => {
    expect(css).toMatch(/\.primary-nav__item \{[\s\S]*?color:\s*#d7d0e8/);
    expect(css).toMatch(/\.primary-nav__item \{[\s\S]*?background:\s*transparent/);
    expect(css).toContain("color: #b8a8e8");
    expect(css).toContain("background: #17132b");
    expect(css).toContain("border-radius: 1.5rem");
    expect(css).toContain("text-transform: uppercase");
    expect(css).toContain("letter-spacing: 0.075em");
    expect(css).toContain("box-shadow: 0 10px 30px rgba(23, 19, 43, 0.24)");
  });

  it("preserves safe-area offset, focus, aria-current, and 48px targets", () => {
    expect(css).toContain("env(safe-area-inset-bottom, 0px)");
    expect(css).toContain("--primary-nav-offset");
    const mobileBlock = css.match(/\.primary-nav--mobile \{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(mobileBlock).toContain("bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px))");
    expect(mobileBlock).toContain("margin-top: 0");
    expect(mobileBlock).toContain("safe-area-inset-bottom");
    expect(css).toContain("min-height: 48px");
    expect(css).toContain(".primary-nav__item:focus-visible");
    expect(component).toContain('aria-current={active ? "page" : undefined}');
    expect(component).toContain('aria-label="Giga3 primary navigation"');
    expect(component).toContain("triggerHaptic");
  });

  it("activates only the tab that matches the route", () => {
    const sequence = [
      "/chat",
      "/gigalearn",
      "/gigalearn/exam",
      "/gigasocial",
      "/marketplace",
      "/media",
      "/chat",
    ];
    expect(sequence.map((path) => resolvePrimaryNavTab(path))).toEqual([
      "home",
      "learn",
      "practice",
      "social",
      "market",
      null,
      "home",
    ]);
    expect(resolvePrimaryNavTab("/gigalearn")).not.toBe("home");
    expect(resolvePrimaryNavTab("/gigasocial/profile")).toBe("social");
    expect(resolvePrimaryNavTab("/chat/login")).toBeNull();
  });
});
