import { describe, expect, it } from "vitest";
import {
  buildMethodologyPromptBlock,
  selectMethodologiesForContext,
  TEACHING_METHODOLOGIES,
} from "../../web/lib/gigalearn/methodologies";
import { resolvePrimaryArea, LEGACY_TAB_ALIASES } from "../../web/lib/gigalearn/sectionRouting";
import { GIGALEARN_PRIMARY_AREAS } from "../../web/lib/gigalearn/sections";

describe("teaching methodologies", () => {
  it("defines 20 structured methodologies", () => {
    expect(TEACHING_METHODOLOGIES).toHaveLength(20);
    for (const m of TEACHING_METHODOLOGIES) {
      expect(m.id).toBeTruthy();
      expect(m.activitySectionLabel).toBeTruthy();
      expect(m.suitableBands.length).toBeGreaterThan(0);
    }
  });

  it("auto-selects early-years methods for KG counting topics", () => {
    const picked = selectMethodologiesForContext({
      levelBand: "early-years",
      subjectId: "mathematics",
      topic: "Counting 1-10",
      max: 6,
    });
    expect(picked.length).toBeGreaterThan(0);
    expect(picked.some((m) => m.id === "look-and-say" || m.id === "hands-on")).toBe(true);
  });

  it("buildMethodologyPromptBlock includes activity section labels", () => {
    const block = buildMethodologyPromptBlock(
      selectMethodologiesForContext({
        levelBand: "early-years",
        topic: "counting",
        max: 3,
      }),
      { levelBand: "early-years", gradeLabel: "KG1" }
    );
    expect(block).toContain("TEACHING METHODOLOGY");
    expect(block).toMatch(/SEE & SAY|PLAY|HANDS-ON|SING/);
    expect(block).toContain("Early Years");
  });
});

describe("GigaLearn section routing", () => {
  it("exposes six primary areas", () => {
    expect(GIGALEARN_PRIMARY_AREAS.map((a) => a.id)).toEqual([
      "student",
      "teacher",
      "create",
      "parent",
      "insight",
      "tutor",
    ]);
  });

  it("maps legacy tabs to primary areas for backward compatibility", () => {
    expect(resolvePrimaryArea("homework")).toBe("student");
    expect(resolvePrimaryArea("studio")).toBe("teacher");
    expect(resolvePrimaryArea("rhymes")).toBe("create");
    expect(resolvePrimaryArea("workspace")).toBe("insight");
    expect(resolvePrimaryArea("tutor")).toBe("tutor");
    expect(Object.keys(LEGACY_TAB_ALIASES).length).toBeGreaterThan(5);
  });
});
