/**
 * Academy visual design tokens — presentation only; no behaviour changes.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACADEMY_COLOUR_TOKENS,
  ACADEMY_STUDIO_CLASS,
  ACADEMY_SURFACE_CLASS,
  studioThemeClass,
} from "../../web/lib/gigalearn/academy/visualTheme";
import { LEARNING_STUDIOS } from "../../web/lib/gigalearn/academy/learningStudios";

const ROOT = resolve(__dirname, "../..");

describe("Academy visual theme", () => {
  it("defines surface and studio colour tokens from the design brief", () => {
    expect(ACADEMY_COLOUR_TOKENS.hero.bg).toBe("#4C1D95");
    expect(ACADEMY_COLOUR_TOKENS.hero.bgAlt).toBe("#312E81");
    expect(ACADEMY_COLOUR_TOKENS.dashboard.bg).toBe("#F3E8FF");
    expect(ACADEMY_COLOUR_TOKENS.practice.bg).toBe("#1E3A8A");
    expect(ACADEMY_COLOUR_TOKENS.performance.bg).toBe("#DCFCE7");
    expect(ACADEMY_COLOUR_TOKENS.certificates.bg).toBe("#FEF3C7");
    expect(ACADEMY_COLOUR_TOKENS.catalogue.bg).toBe("#FFFFFF");
    expect(Object.keys(ACADEMY_COLOUR_TOKENS.studios)).toHaveLength(7);
  });

  it("maps every Learning Studio id to a distinct theme class", () => {
    for (const studio of LEARNING_STUDIOS) {
      expect(studioThemeClass(studio.id)).toContain(`academy-visual-studio--${studio.id}`);
      expect(ACADEMY_STUDIO_CLASS[studio.id as keyof typeof ACADEMY_STUDIO_CLASS]).toBeTruthy();
    }
    expect(ACADEMY_SURFACE_CLASS.hero).toBe("academy-visual-hero");
    expect(ACADEMY_SURFACE_CLASS.practice).toBe("academy-visual-practice");
  });

  it("applies visual classes on AcademyHome without inventing progress copy", () => {
    const home = readFileSync(
      resolve(ROOT, "web/components/gigalearn/academy/AcademyHome.tsx"),
      "utf8"
    );
    expect(home).toContain("ACADEMY_SURFACE_CLASS");
    expect(home).toContain("ACADEMY_SURFACE_CLASS.hero");
    expect(home).toContain("ACADEMY_SURFACE_CLASS.dashboard");
    expect(home).toContain("ACADEMY_SURFACE_CLASS.practice");
    expect(home).toContain("ACADEMY_SURFACE_CLASS.performance");
    expect(home).toContain("ACADEMY_SURFACE_CLASS.certificates");
    expect(home).toContain("ACADEMY_SURFACE_CLASS.catalogue");
    expect(home).toContain("studioThemeClass");
    expect(home).toContain("Coming soon");
    expect(home).toContain("Available");
    expect(home).toContain("we will not invent progress");
    expect(home).not.toContain("localStorage.setItem");
  });

  it("ships CSS tokens with reduced-motion and focus styles", () => {
    const css = readFileSync(resolve(ROOT, "web/styles/globals.css"), "utf8");
    expect(css).toContain(".academy-visual-hero");
    expect(css).toContain(".academy-visual-studio--giga-ai");
    expect(css).toContain(".academy-visual-studio--giga-innovation");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain(".academy-visual-cta:focus-visible");
  });
});
