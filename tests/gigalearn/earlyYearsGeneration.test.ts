import { describe, expect, it } from "vitest";
import {
  EARLY_YEARS_SUBJECTS,
  EARLY_YEARS_TOPICS,
} from "../../web/lib/gigalearn/concreteObjects";
import { getLevel } from "../../web/lib/gigalearn/curriculumEngine";
import {
  curriculumLevelIdToGigaLearnLevel,
  gigaLearnLevelToCurriculumLevelId,
  isLowerGrade,
} from "../../web/lib/gigalearn/levels";
import { selectMethodologiesForContext } from "../../web/lib/gigalearn/methodologies";
import { studentSubViewFromTab } from "../../web/lib/gigalearn/sectionRouting";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("early years generation wiring", () => {
  it("maps concrete levels to curriculum ids for Convex generation", () => {
    expect(gigaLearnLevelToCurriculumLevelId("Creche")).toBe("kg-1");
    expect(gigaLearnLevelToCurriculumLevelId("KG1")).toBe("kg-1");
    expect(gigaLearnLevelToCurriculumLevelId("KG2")).toBe("kg-2");
    expect(gigaLearnLevelToCurriculumLevelId("P1")).toBe("basic-1");
    expect(gigaLearnLevelToCurriculumLevelId("P2")).toBe("basic-2");
    expect(gigaLearnLevelToCurriculumLevelId("P3")).toBe("basic-3");
  });

  it("round-trips curriculum level ids to concrete chips", () => {
    expect(curriculumLevelIdToGigaLearnLevel("kg-1")).toBe("KG1");
    expect(curriculumLevelIdToGigaLearnLevel("kg-2")).toBe("KG2");
    expect(curriculumLevelIdToGigaLearnLevel("basic-1")).toBe("P1");
  });

  it("selects early-years methodologies for KG counting topics", () => {
    const methods = selectMethodologiesForContext({
      levelBand: "early-years",
      subjectId: "mathematics",
      topic: "Counting 1-5",
      max: 6,
    });
    expect(methods.length).toBeGreaterThan(0);
    expect(methods.some((m) => m.id === "look-and-say" || m.id === "hands-on")).toBe(true);
  });

  it("exposes child-friendly subjects and topics", () => {
    expect(EARLY_YEARS_SUBJECTS.map((s) => s.id)).toEqual(["mathematics", "english", "science"]);
    expect(EARLY_YEARS_TOPICS.mathematics.some((t) => t.label.includes("Counting"))).toBe(true);
    expect(EARLY_YEARS_TOPICS.english.some((t) => t.label.includes("Letter"))).toBe(true);
  });

  it("routes ?tab=early-years to student early-years sub-view", () => {
    expect(studentSubViewFromTab("early-years")).toBe("early-years");
  });

  it("LowerGradesConcrete wires generation panel and context sync", () => {
    const source = readFileSync(
      resolve(__dirname, "../../web/components/gigalearn/LowerGradesConcrete.tsx"),
      "utf8"
    );
    expect(source).toContain("EarlyYearsActivityPanel");
    expect(source).toContain("gigaLearnLevelToCurriculumLevelId");
    expect(source).toContain("onCtxChange");
  });

  it("EarlyYearsActivityPanel uses existing generation hook and levelId", () => {
    const source = readFileSync(
      resolve(__dirname, "../../web/components/gigalearn/EarlyYearsActivityPanel.tsx"),
      "utf8"
    );
    expect(source).toContain("useGigaLearnGeneration");
    expect(source).toContain("levelId:");
    expect(source).toContain("methodologyIds");
    expect(source).toContain("topic-explainer");
  });

  it("curriculum levels for early years and P1 have correct bands", () => {
    expect(getLevel("kg-1")?.band).toBe("early-years");
    expect(getLevel("kg-2")?.band).toBe("early-years");
    expect(getLevel("basic-1")?.band).toBe("primary");
    for (const level of ["Creche", "KG1", "KG2", "P1", "P2", "P3"]) {
      expect(isLowerGrade(level)).toBe(true);
    }
  });
});
