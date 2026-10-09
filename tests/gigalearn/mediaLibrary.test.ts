import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  getMediaItemById,
  listMediaByCategory,
  MEDIA_LIBRARY_CATALOG,
} from "../../web/lib/gigalearn/mediaLibrary/catalog";
import {
  filterMediaLibrary,
  formatBytes,
} from "../../web/lib/gigalearn/mediaLibrary/filters";
import { estimateMediaPackBytes } from "../../web/lib/gigalearn/mediaLibrary/offlineMedia";
import { studentSubViewFromTab } from "../../web/lib/gigalearn/sectionRouting";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("GigaLearn multimedia Discover catalog", () => {
  it("ships representative KG2 Ghana-first sample content with required metadata", () => {
    expect(MEDIA_LIBRARY_CATALOG.length).toBeGreaterThanOrEqual(8);
    for (const item of MEDIA_LIBRARY_CATALOG) {
      expect(item.id).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(item.description.length).toBeGreaterThan(20);
      expect(item.levels.length).toBeGreaterThan(0);
      expect(item.subject).toBeTruthy();
      expect(item.topic).toBeTruthy();
      expect(item.languages.length).toBeGreaterThan(0);
      expect(item.illustration.kind).toBe("emoji");
      expect(item.narrations.length).toBeGreaterThan(0);
      expect(item.estimatedOfflineBytes).toBeGreaterThan(0);
      expect(item.rights.source).toBeTruthy();
      expect(item.rights.rights).toBeTruthy();
    }
    const mango = getMediaItemById("pic-mango-kg2");
    expect(mango?.levels).toContain("KG2");
    expect(mango?.game?.answer).toContain("Mango");
    expect(mango?.languages).toEqual(expect.arrayContaining(["en", "tw"]));
  });

  it("keeps Ghana country profile factual and omits unverified anthem lyrics", () => {
    const ghana = getMediaItemById("country-ghana-profile");
    expect(ghana?.description).toContain("Accra");
    expect(ghana?.description.toLowerCase()).toContain("anthem");
    expect(ghana?.description).toMatch(/not bundled|licensed|officially published/i);
    expect(ghana?.game?.answer).toBe("Accra");
  });

  it("filters by discover category, grade, language and content type", () => {
    const pictures = listMediaByCategory("pictures-objects");
    expect(pictures.every((item) => item.discoverCategory === "pictures-objects")).toBe(true);

    const kg2Culture = filterMediaLibrary(MEDIA_LIBRARY_CATALOG, {
      category: "africa-culture",
      level: "KG2",
    });
    expect(kg2Culture.length).toBeGreaterThan(0);
    expect(kg2Culture.every((item) => item.levels.includes("KG2"))).toBe(true);

    const twi = filterMediaLibrary(MEDIA_LIBRARY_CATALOG, { language: "tw" });
    expect(twi.every((item) => item.languages.includes("tw"))).toBe(true);

    const games = filterMediaLibrary(MEDIA_LIBRARY_CATALOG, { contentType: "game" });
    expect(games.every((item) => item.contentType === "game")).toBe(true);
  });

  it("estimates offline pack size without auto-caching the whole catalogue", () => {
    const item = getMediaItemById("pic-mango-kg2")!;
    expect(estimateMediaPackBytes(item)).toBe(item.estimatedOfflineBytes);
    expect(formatBytes(2048)).toContain("KB");
  });

  it("wires Discover into student routing and hub navigation", () => {
    expect(studentSubViewFromTab("discover")).toBe("discover");
    const hub = read("web/components/gigalearn/hubs/StudentHub.tsx");
    expect(hub).toContain("DiscoverHub");
    expect(hub).toContain('{ id: "discover", label: "Discover" }');
    expect(hub).toContain("preferredCountryId");
    expect(read("web/lib/gigalearn/mediaLibrary/types.ts")).toContain("My Offline Learning");
    expect(read("web/components/gigalearn/discover/DiscoverHub.tsx")).toContain("DISCOVER_CATEGORIES");
    expect(read("web/components/gigalearn/discover/DiscoverHub.tsx")).toContain(
      "loadCatalogForCountry"
    );
    expect(read("web/components/gigalearn/discover/MediaItemPlayer.tsx")).toContain(
      "Save for offline"
    );
    expect(read("web/lib/gigalearn/offlineLessons.ts")).toContain("OFFLINE_MEDIA_STORE");
  });
});
