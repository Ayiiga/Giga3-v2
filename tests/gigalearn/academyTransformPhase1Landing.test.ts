/**
 * Academy transformation Phase 1 — landing hub, studios, nav (no assessment rewrite).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACADEMY_TRANSFORM_TAGLINE,
  LEARNING_STUDIOS,
} from "../../web/lib/gigalearn/academy/learningStudios";
import { listBuiltinAcademyCourses } from "../../web/lib/gigalearn/academy/courseCatalog";

const ROOT = resolve(__dirname, "../..");

describe("Academy transform Phase 1 landing", () => {
  it("ships the Learn by Doing tagline and seven studios", () => {
    expect(ACADEMY_TRANSFORM_TAGLINE).toBe(
      "Learn by Doing. Build with AI. Create the Future."
    );
    expect(LEARNING_STUDIOS).toHaveLength(7);
    expect(LEARNING_STUDIOS.map((s) => s.name)).toEqual([
      "GigaAI Studio",
      "GigaWeb Studio",
      "GigaPWA Studio",
      "GigaApp Studio",
      "GigaCoding Studio",
      "GigaRobotics Studio",
      "GigaInnovation Studio",
    ]);
  });

  it("deep-links only available studios to real GigaLearn hubs", () => {
    const available = LEARNING_STUDIOS.filter((s) => s.status === "available");
    const planned = LEARNING_STUDIOS.filter((s) => s.status === "planned");
    expect(available.length).toBe(3);
    expect(planned.length).toBe(4);
    for (const studio of available) {
      expect(studio.href).toBeTruthy();
      expect(studio.href!.startsWith("/gigalearn")).toBe(true);
    }
    for (const studio of planned) {
      expect(studio.href).toBeUndefined();
    }
    expect(available.map((s) => s.id).sort()).toEqual([
      "giga-ai",
      "giga-coding",
      "giga-innovation",
    ]);
  });

  it("preserves builtin pathways while landing uses AcademyHome", () => {
    expect(listBuiltinAcademyCourses().length).toBeGreaterThanOrEqual(4);
    expect(existsSync(resolve(ROOT, "web/components/gigalearn/academy/AcademyHome.tsx"))).toBe(
      true
    );
    expect(
      existsSync(resolve(ROOT, "web/app/(marketing)/gigalearn/academy/courses/page.tsx"))
    ).toBe(true);

    const homePage = readFileSync(
      resolve(ROOT, "web/app/(marketing)/gigalearn/academy/page.tsx"),
      "utf8"
    );
    expect(homePage).toContain("AcademyHomeRoot");
    expect(homePage).toContain("Learn by Doing");

    const home = readFileSync(
      resolve(ROOT, "web/components/gigalearn/academy/AcademyHome.tsx"),
      "utf8"
    );
    expect(home).toContain("Practice Centre");
    expect(home).toContain("Learning Studios");
    expect(home).toContain("Existing Academy");
    expect(home).toContain("Your learning summary");
    expect(home).toContain("listMyEnrolments");
    expect(home).toContain("listMyAssessmentHistory");
    expect(home).toContain("listMyCertificates");
    expect(home).toContain("ProductSignInPrompt");
    expect(home).toContain("Coming soon");
    expect(home).toContain("/gigalearn/academy/assess/");
    expect(home).not.toContain("localStorage.setItem");
  });

  it("extends AcademyChrome without removing core destinations", () => {
    const chrome = readFileSync(
      resolve(ROOT, "web/components/gigalearn/academy/AcademyChrome.tsx"),
      "utf8"
    );
    for (const href of [
      "/gigalearn/academy/",
      "/gigalearn/academy/courses/",
      "/gigalearn/academy/assess/",
      "/gigalearn/academy/my/",
      "/gigalearn/academy/certificates/",
      "/gigalearn/academy/verify/",
      "/gigalearn/academy/author/",
      "/gigalearn/",
    ]) {
      expect(chrome).toContain(href);
    }
  });

  it("keeps existing Academy route files", () => {
    const routes = [
      "web/app/(marketing)/gigalearn/academy/page.tsx",
      "web/app/(marketing)/gigalearn/academy/courses/page.tsx",
      "web/app/(marketing)/gigalearn/academy/course/page.tsx",
      "web/app/(marketing)/gigalearn/academy/my/page.tsx",
      "web/app/(marketing)/gigalearn/academy/assess/page.tsx",
      "web/app/(marketing)/gigalearn/academy/certificates/page.tsx",
      "web/app/(marketing)/gigalearn/academy/verify/page.tsx",
      "web/app/(marketing)/gigalearn/academy/author/page.tsx",
    ];
    for (const rel of routes) {
      expect(existsSync(resolve(ROOT, rel))).toBe(true);
    }
    const sitemap = readFileSync(resolve(ROOT, "web/public/sitemap-gigalearn.xml"), "utf8");
    expect(sitemap).toContain("/gigalearn/academy/");
    expect(sitemap).toContain("/gigalearn/academy/courses/");
  });
});
