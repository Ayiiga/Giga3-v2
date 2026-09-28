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
    expect(css).toContain("background: #5b21b6");
    expect(css).toContain("color: #fff");
    expect(css).toContain("box-shadow: 0 4px 20px rgba(91, 33, 182, 0.4)");
    expect(css).toContain("font-weight: 700");
    expect(css).not.toContain("scale-105");
    expect(css).not.toContain("translateY(-0.5px)");
    expect(globals).toContain("background: #5b21b6 !important");
    expect(globals).toContain("color: #fff !important");
    expect(globals).toContain("z-index: 60 !important");
    expect(globals).not.toMatch(/primary-nav__item--active svg[\s\S]{0,180}color:\s*#7c3aed/);
  });

  it("keeps inactive tabs white with gray-500 text and darker icons", () => {
    expect(css).toMatch(/\.primary-nav__item \{[\s\S]*?color:\s*#6b7280/);
    expect(css).toMatch(/\.primary-nav__item \{[\s\S]*?background:\s*#fff/);
    expect(css).toContain("color: #4b5563");
    expect(css).toContain("background: rgba(255, 255, 255, 0.98)");
    expect(css).toContain("border-top: 1px solid #e5e7eb");
    expect(css).toContain("box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.08)");
  });

  it("preserves safe-area offset, focus, aria-current, and 48px targets", () => {
    expect(css).toContain("env(safe-area-inset-bottom, 0px)");
    expect(css).toContain("--primary-nav-offset");
    const mobileBlock = css.match(/\.primary-nav--mobile \{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(mobileBlock).toContain("bottom: 0");
    expect(mobileBlock).toContain("margin-top: 0");
    expect(mobileBlock).not.toContain("safe-area-inset-bottom");
    expect(css).toContain("min-height: 48px");
    expect(css).toContain(".primary-nav__item:focus-visible");
    expect(component).toContain('aria-current={active ? "page" : undefined}');
    expect(component).toContain('aria-label="Giga3 primary navigation"');
    expect(component).toContain("triggerHaptic");
  });

  it("activates only the tab that matches the route", () => {
    const sequence = ["/chat", "/gigalearn", "/media", "/gigasocial", "/gigaedit", "/chat"];
    expect(sequence.map((path) => resolvePrimaryNavTab(path))).toEqual([
      "home",
      "learn",
      "create",
      "social",
      "create",
      "home",
    ]);
    expect(resolvePrimaryNavTab("/gigalearn")).not.toBe("home");
    expect(resolvePrimaryNavTab("/gigasocial/profile")).toBe("social");
    expect(resolvePrimaryNavTab("/chat/login")).toBeNull();
  });
});
