import { describe, expect, it } from "vitest";
import {
  CREATOR_HOME_ACTIONS,
  CREATOR_STUDIO_ENGINES,
  CREATOR_STUDIO_PHASES,
  CREATOR_STUDIO_PRODUCT_NAME,
  DEFAULT_BRAND_KIT,
  activeEngines,
  computeProjectDurationSec,
  formatProjectDuration,
  resolutionLabelForAspect,
} from "../../web/lib/gigaedit/creatorStudio";
import { createEmptyProject } from "../../web/lib/gigaedit/projects";

describe("Creator Studio plan", () => {
  it("names the product and defines phased rollout", () => {
    expect(CREATOR_STUDIO_PRODUCT_NAME).toContain("Creator Studio");
    expect(CREATOR_STUDIO_PHASES.length).toBeGreaterThanOrEqual(5);
    expect(CREATOR_STUDIO_PHASES.some((p) => p.status === "in_progress")).toBe(true);
  });

  it("registers modular engines without fake active AI story", () => {
    const story = CREATOR_STUDIO_ENGINES.find((e) => e.id === "StoryEngine");
    expect(story?.status).toBe("planned");
    expect(activeEngines().some((e) => e.id === "ExportEngine")).toBe(true);
  });
});

describe("Creator Home actions", () => {
  it("includes honest dashboard quick actions", () => {
    const ids = CREATOR_HOME_ACTIONS.map((a) => a.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "new-project",
        "import-video",
        "import-images",
        "record-video",
        "record-voice",
        "generate-ai",
        "templates",
        "brand-kit",
      ])
    );
  });

  it("routes import video to video section with autoImport flag", () => {
    const importVideo = CREATOR_HOME_ACTIONS.find((a) => a.id === "import-video");
    expect(importVideo?.section).toBe("video");
    expect(importVideo?.openFlags?.autoImport).toBe(true);
  });
});

describe("Project summary helpers", () => {
  it("formats duration and resolution labels", () => {
    expect(formatProjectDuration(125)).toBe("2:05");
    expect(resolutionLabelForAspect("9:16")).toBe("1080×1920");
  });

  it("computes duration from clips when metadata missing", () => {
    const project = createEmptyProject({ kind: "video" });
    project.clips = [
      {
        id: "a",
        track: "video",
        label: "A",
        startSec: 0,
        endSec: 12,
        speed: 1,
        rotateDeg: 0,
        filterId: "none",
      },
    ];
    expect(computeProjectDurationSec(project)).toBe(12);
  });
});

describe("Brand Kit defaults", () => {
  it("ships sensible default colors", () => {
    expect(DEFAULT_BRAND_KIT.primaryColor).toMatch(/^#/);
    expect(DEFAULT_BRAND_KIT.name).toBeTruthy();
  });
});
