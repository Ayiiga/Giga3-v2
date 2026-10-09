import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertCatalogCountryMetadata,
  getCatalogForCountrySync,
  loadCatalogForCountry,
  MEDIA_LIBRARY_CATALOG,
} from "../../web/lib/gigalearn/mediaLibrary/catalog";
import {
  GHANA_KG2_MEDIA_SLICE_IDS,
  GHANA_MEDIA_CATALOG,
} from "../../web/lib/gigalearn/mediaLibrary/catalog.ghana";
import {
  getMediaCountry,
  listAvailableMediaCountries,
  MEDIA_COUNTRY_PROFILES,
  visibleRegionScopesForCountry,
} from "../../web/lib/gigalearn/mediaLibrary/countryRegistry";
import { filterMediaLibrary } from "../../web/lib/gigalearn/mediaLibrary/filters";
import { requiredRemoteAssets } from "../../web/lib/gigalearn/mediaLibrary/offlineMedia";
import { CURRICULUM_COUNTRIES } from "../../web/lib/gigalearn/curriculumEngine";

describe("Discover country-aware architecture", () => {
  it("aligns media country registry with curriculumEngine ids", () => {
    const available = listAvailableMediaCountries();
    expect(available.map((c) => c.id)).toContain("ghana");
    expect(available.every((c) => c.available)).toBe(true);

    for (const country of CURRICULUM_COUNTRIES) {
      const profile = getMediaCountry(country.id);
      expect(profile?.name).toBe(country.name);
      expect(profile?.flag).toBe(country.flag);
      expect(profile?.available).toBe(country.available);
    }

    const ghana = getMediaCountry("ghana")!;
    expect(ghana.iso2).toBe("GH");
    expect(ghana.curriculumIds).toContain("gh-ccp");
    expect(ghana.languages).toEqual(
      expect.arrayContaining(["en", "tw", "ee", "gaa", "dag", "ha"])
    );

    const nigeria = getMediaCountry("nigeria")!;
    expect(nigeria.available).toBe(false);
    expect(nigeria.homeRegion).toBe("west-africa");
  });

  it("loads only available country shards (Ghana now, Nigeria empty stub)", async () => {
    const gh = await loadCatalogForCountry("ghana");
    expect(gh.length).toBe(GHANA_MEDIA_CATALOG.length);
    expect(getCatalogForCountrySync("ghana")).toBe(GHANA_MEDIA_CATALOG);

    const ng = await loadCatalogForCountry("nigeria");
    expect(ng).toEqual([]);
    expect(getCatalogForCountrySync("nigeria")).toEqual([]);

    const ke = await loadCatalogForCountry("kenya");
    expect(ke).toEqual([]);
  });

  it("completes Ghana packs with country, curriculum, age and rights metadata", () => {
    const errors = assertCatalogCountryMetadata(MEDIA_LIBRARY_CATALOG);
    expect(errors).toEqual([]);
    expect(MEDIA_LIBRARY_CATALOG.every((item) => item.countryId === "ghana")).toBe(true);
    expect(MEDIA_LIBRARY_CATALOG.every((item) => item.countryCode === "GH")).toBe(true);
    expect(MEDIA_LIBRARY_CATALOG.every((item) => item.curriculumId === "gh-ccp")).toBe(true);
    expect(
      MEDIA_LIBRARY_CATALOG.filter((item) => item.levels.includes("KG2")).length
    ).toBeGreaterThanOrEqual(8);

    const languages = new Set(MEDIA_LIBRARY_CATALOG.flatMap((item) => item.languages));
    expect(languages.has("en")).toBe(true);
    expect(languages.has("tw")).toBe(true);
    expect(languages.has("gaa")).toBe(true);
    expect(languages.has("ee")).toBe(true);

    const ghanaProfile = MEDIA_LIBRARY_CATALOG.find((i) => i.id === "country-ghana-profile")!;
    expect(ghanaProfile.rights.reviewed).toBe(true);
    expect(ghanaProfile.description).toMatch(/not bundled|licensed|officially published/i);

    // Packs that ship espeak-ng audio must not claim educator review.
    for (const id of [
      "pic-mango-kg2",
      "rhyme-mango-sweet",
      "story-ananse-listen",
    ] as const) {
      const item = MEDIA_LIBRARY_CATALOG.find((row) => row.id === id)!;
      expect(item.rights.reviewed).toBe(false);
      expect(item.rights.source).toMatch(/espeak-ng/i);
      expect(item.rights.source).toMatch(/not educator-reviewed/i);
    }
  });

  it("filters by country, curriculum level and language without inventing other countries", () => {
    const ghOnly = filterMediaLibrary(MEDIA_LIBRARY_CATALOG, { countryId: "ghana" });
    expect(ghOnly.length).toBe(MEDIA_LIBRARY_CATALOG.length);

    const ngFilter = filterMediaLibrary(MEDIA_LIBRARY_CATALOG, { countryId: "nigeria" });
    expect(ngFilter).toEqual([]);

    const kg2 = filterMediaLibrary(MEDIA_LIBRARY_CATALOG, {
      countryId: "ghana",
      curriculumLevelId: "kg-2",
    });
    expect(kg2.every((item) => item.curriculumLevelId === "kg-2")).toBe(true);

    const twi = filterMediaLibrary(MEDIA_LIBRARY_CATALOG, {
      countryId: "ghana",
      language: "tw",
    });
    expect(twi.every((item) => item.languages.includes("tw"))).toBe(true);

    expect(visibleRegionScopesForCountry("ghana")).toEqual([
      "country",
      "west-africa",
      "africa",
      "global",
    ]);
  });

  it("keeps unavailable countries from exposing learning packs on switch", async () => {
    expect(listAvailableMediaCountries().map((c) => c.id)).toEqual(["ghana"]);
    const unavailable = MEDIA_COUNTRY_PROFILES.filter((c) => !c.available);
    expect(unavailable.map((c) => c.id)).toContain("nigeria");
    for (const country of unavailable) {
      expect(await loadCatalogForCountry(country.id)).toEqual([]);
      expect(getCatalogForCountrySync(country.id)).toEqual([]);
    }
  });

  it("ships a complete Ghana KG2 multimedia slice with on-disk assets", () => {
    for (const id of GHANA_KG2_MEDIA_SLICE_IDS) {
      const item = MEDIA_LIBRARY_CATALOG.find((row) => row.id === id)!;
      expect(item.levels).toContain("KG2");
      expect(item.offlineEligible).toBe(true);
      const required = requiredRemoteAssets(item);
      expect(required.length).toBeGreaterThan(0);
      for (const asset of required) {
        const file = resolve(__dirname, "../../web/public", asset.url.replace(/^\//, ""));
        expect(existsSync(file), asset.url).toBe(true);
        expect(readFileSync(file).byteLength).toBeGreaterThan(0);
      }
    }
    expect(GHANA_KG2_MEDIA_SLICE_IDS).toEqual(
      expect.arrayContaining([
        "pic-mango-kg2",
        "rhyme-mango-sweet",
        "story-ananse-listen",
        "game-count-bananas-kg2",
      ])
    );
  });
});
