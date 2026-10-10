/**
 * @vitest-environment happy-dom
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../../web/lib/gigaedit/projects";
import {
  GIGAEDIT_STARTER_PACK_IDS,
  GIGAEDIT_TEMPLATES,
  getGigaEditMoreTemplates,
  getGigaEditStarterPackTemplates,
  type GigaEditTemplate,
} from "../../web/lib/gigaedit/templates";

/** Mirrors TemplateGallery apply semantics without IndexedDB. */
function seedProjectFromTemplate(t: GigaEditTemplate) {
  const kind = t.category === "photo" || t.category === "business" ? "photo" : "video";
  const project = createEmptyProject({
    kind,
    title: t.title,
    aspectRatio: t.aspectRatio,
  });
  project.aiAssisted = t.aiLabel;
  project.notes = t.id;
  project.overlayText = t.title;
  return project;
}

describe("GigaEdit Creator Growth Starter Pack", () => {
  it("exposes exactly three existing registry IDs (no duplicates invented)", () => {
    expect(GIGAEDIT_STARTER_PACK_IDS).toHaveLength(3);
    expect([...GIGAEDIT_STARTER_PACK_IDS]).toEqual(["hook-reel", "yt-intro", "poster-promo"]);
    for (const id of GIGAEDIT_STARTER_PACK_IDS) {
      expect(GIGAEDIT_TEMPLATES.some((t) => t.id === id)).toBe(true);
    }
    expect(new Set(GIGAEDIT_STARTER_PACK_IDS).size).toBe(3);
  });

  it("returns the three starters from the shared registry without cloning definitions", () => {
    const pack = getGigaEditStarterPackTemplates();
    expect(pack.map((t) => t.id)).toEqual(["hook-reel", "yt-intro", "poster-promo"]);
    for (const t of pack) {
      const canonical = GIGAEDIT_TEMPLATES.find((x) => x.id === t.id);
      expect(t).toBe(canonical);
    }
    const more = getGigaEditMoreTemplates();
    expect(more).toHaveLength(GIGAEDIT_TEMPLATES.length - 3);
    expect(more.every((t) => !GIGAEDIT_STARTER_PACK_IDS.includes(t.id as never))).toBe(true);
  });

  it("seeds distinct, usable projects for each starter (aspect, kind, title overlay)", () => {
    const pack = getGigaEditStarterPackTemplates();
    const seeded = pack.map(seedProjectFromTemplate);

    expect(seeded[0]).toMatchObject({
      kind: "video",
      aspectRatio: "9:16",
      notes: "hook-reel",
      overlayText: "Hook Reel",
      aiAssisted: false,
      offlineReady: true,
    });
    expect(seeded[1]).toMatchObject({
      kind: "video",
      aspectRatio: "16:9",
      notes: "yt-intro",
      overlayText: "YouTube Intro",
      aiAssisted: false,
    });
    expect(seeded[2]).toMatchObject({
      kind: "photo",
      aspectRatio: "4:5",
      notes: "poster-promo",
      overlayText: "Promo Poster",
      aiAssisted: true,
    });

    const aspects = new Set(seeded.map((p) => p.aspectRatio));
    expect(aspects.size).toBe(3);
  });

  it("keeps Starter Pack copy free of unfinished layout promises", () => {
    for (const t of getGigaEditStarterPackTemplates()) {
      expect(t.description.toLowerCase()).not.toMatch(/beat marker|safe zone|face-safe|contact block/);
      expect(t.description.toLowerCase()).toMatch(/import/);
      expect(t.offline).toBe(true);
    }
  });

  it("wires the TemplateGallery to the starter helpers (no second registry)", () => {
    const gallery = readFileSync(
      resolve(__dirname, "../../web/components/gigaedit/TemplateGallery.tsx"),
      "utf8"
    );
    expect(gallery).toContain("getGigaEditStarterPackTemplates");
    expect(gallery).toContain("getGigaEditMoreTemplates");
    expect(gallery).toContain("Creator Growth Starter Pack");
    expect(gallery).toContain("Start creating with GigaEdits");
    expect(gallery).toContain("Hook Reel");
    expect(gallery).toContain("9:16");
    expect(gallery).toContain("YouTube Intro");
    expect(gallery).toContain("16:9");
    expect(gallery).toContain("Promo Poster");
    expect(gallery).toContain("4:5");
    expect(gallery).toContain('data-starter-pack');
    expect(gallery).toContain("not finished timeline layouts");
    expect(gallery).not.toMatch(/id:\s*["']hook-reel["']/);
  });
});
