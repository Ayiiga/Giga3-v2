import { describe, expect, it } from "vitest";
import {
  AFRICAN_VOICES,
  getAfricanVoice,
  voicesForTab,
} from "../../web/lib/gigaedit/africanVoices";
import {
  deduplicateGigaEditProjects,
  formatBytes,
  staleDraftSuggestions,
  type GigaEditProjectRecord,
} from "../../web/lib/gigaedit/projects";

function makeProject(partial: Partial<GigaEditProjectRecord>): GigaEditProjectRecord {
  return {
    id: `ge_${Math.random().toString(36).slice(2, 8)}`,
    title: "Test",
    kind: "video",
    status: "draft",
    createdAt: 1,
    updatedAt: 2,
    aspectRatio: "9:16",
    aiAssisted: false,
    hasOriginal: false,
    offlineReady: true,
    clips: [],
    ...partial,
  } as GigaEditProjectRecord;
}

describe("gigaedits audit fixes", () => {
  it("deduplicates repeated project ids (1001144701 appearing 3x keeps latest)", () => {
    const rows = [
      makeProject({ id: "1001144701", updatedAt: 1 }),
      makeProject({ id: "1001144701", updatedAt: 3 }),
      makeProject({ id: "1001144701", updatedAt: 2 }),
      makeProject({ id: "1001153242", updatedAt: 5 }),
    ];
    const unique = deduplicateGigaEditProjects(rows);
    expect(unique.map((p) => p.id).sort()).toEqual(["1001144701", "1001153242"]);
    expect(unique.find((p) => p.id === "1001144701")?.updatedAt).toBe(3);
  });

  it("seeds African voiceovers incl. Twi/Hausa/Yoruba/Swahili with accent badges", () => {
    const ids = AFRICAN_VOICES.map((v) => v.id);
    for (const required of ["twi_female", "hausa_male", "ga_female", "ewe_male", "yoruba_female", "swahili_male", "zulu_female", "amharic_male"]) {
      expect(ids).toContain(required);
    }
    expect(AFRICAN_VOICES.every((v) => v.creditCostGhs >= 0)).toBe(true);
    expect(voicesForTab("African").length).toBeGreaterThan(0);
    expect(voicesForTab("African").every((v) => v.group === "African")).toBe(true);
    expect(getAfricanVoice("twi_female")?.africanAccent).toBe(true);
  });

  it("formats storage labels for the My Projects indicator", () => {
    expect(formatBytes(0)).toBe("0 MB");
    expect(formatBytes(2.3 * 1024 * 1024)).toBe("2.3 MB");
    expect(formatBytes(10 * 1024 * 1024 * 1024)).toBe("10 GB");
  });

  it("suggests drafts older than 30 days for cleanup, keeps fresh ones", () => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const rows = [
      makeProject({ id: "old", updatedAt: now - 31 * day }),
      makeProject({ id: "fresh", updatedAt: now - 5 * day }),
      makeProject({ id: "old-exported", updatedAt: now - 60 * day, status: "exported" }),
    ];
    const stale = staleDraftSuggestions(rows, now);
    expect(stale.map((p) => p.id)).toEqual(["old"]);
  });
});
