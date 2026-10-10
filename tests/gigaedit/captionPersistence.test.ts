import { describe, expect, it } from "vitest";
import {
  createEmptyProject,
  exportProjectJson,
  readProjectCaptions,
  type GigaEditProjectRecord,
} from "../../web/lib/gigaedit/projects";

describe("GigaEdit caption persistence (additive)", () => {
  it("treats missing captions on legacy rows as empty string", () => {
    const legacy = {
      id: "ge_legacy",
      title: "Old draft",
      kind: "video",
      status: "draft",
      createdAt: 1,
      updatedAt: 2,
      aspectRatio: "9:16",
      aiAssisted: false,
      hasOriginal: true,
      offlineReady: true,
      clips: [],
      overlayText: "Hello",
      // captions intentionally omitted
    } as GigaEditProjectRecord;

    expect(readProjectCaptions(legacy)).toBe("");
    expect(readProjectCaptions(null)).toBe("");
    expect(readProjectCaptions(undefined)).toBe("");
  });

  it("reads stored captions when present", () => {
    const project = createEmptyProject({ kind: "video", title: "With caps" });
    project.captions = "0:00 Hello\n0:03 World";
    expect(readProjectCaptions(project)).toBe("0:00 Hello\n0:03 World");
  });

  it("includes captions in local JSON export when set", () => {
    const project = createEmptyProject({ kind: "video", title: "Export me" });
    project.captions = "Draft line";
    const json = exportProjectJson(project);
    expect(json).toContain("Draft line");
    expect(json).toContain("GigaEdit local project export");
  });

  it("does not require captions field on empty projects (backward compatible shape)", () => {
    const project = createEmptyProject({ kind: "video", title: "Blank" });
    expect("captions" in project ? project.captions : undefined).toBeUndefined();
    expect(readProjectCaptions(project)).toBe("");
  });
});
