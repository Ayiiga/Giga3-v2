import { describe, expect, it } from "vitest";
import {
  missingRequired,
  nextIntakeField,
  normalizeAnswer,
  stageReadiness,
  upfrontFields,
  withDefaults,
} from "../../web/lib/gigalearn/creation/intake";
import {
  DEMONSTRATION_LABEL,
  NOT_ENDORSED_NOTE,
  STRUCTURE_INPUT_KEY,
  assembleDocument,
  buildProvenance,
  buildStagePrompt,
  deriveSourceReferences,
  finalizeStageContent,
  provenanceLabel,
} from "../../web/lib/gigalearn/creation/prompts";
import {
  CREATION_TEMPLATES,
  ORIGINALITY_RULES,
  RESEARCH_INTEGRITY_RULES,
  getCreationTemplate,
  stagesFor,
} from "../../web/lib/gigalearn/creation/templates";
import { analyzeReferenceDocument } from "../../web/lib/gigalearn/creation/referenceAnalyzer";
import { buildCreationLink, parseCreationLink } from "../../web/lib/gigalearn/creation/links";
import type { CreationInputs, GeneratedSection } from "../../web/lib/gigalearn/creation/types";

const lesson = getCreationTemplate("lesson")!;
const research = getCreationTemplate("research")!;
const cv = getCreationTemplate("cv")!;
const book = getCreationTemplate("book")!;

const researchInputs: CreationInputs = {
  topic: "Effects of mobile phone use on JHS reading habits",
  problem: "Teachers report declining reading time",
  studyArea: "Two JHS schools in Ho Municipality",
  population: "JHS 2 learners",
  academicLevel: "Diploma",
  design: "Descriptive survey",
};

function section(stageId: string, content = "text", demonstrationData = false): GeneratedSection {
  return { stageId, label: stageId, content, generatedAt: 1, demonstrationData };
}

describe("creation templates", () => {
  it("offers the six template types with required metadata", () => {
    expect(CREATION_TEMPLATES.map((t) => t.id)).toEqual(
      expect.arrayContaining(["lesson", "research", "book", "cv", "quiz", "rhyme"])
    );
    expect(CREATION_TEMPLATES).toHaveLength(6);
    for (const template of CREATION_TEMPLATES) {
      expect(template.tagline.length).toBeGreaterThan(10);
      expect(template.backendToolId).toMatch(/^creation-/);
      expect(template.integrityRules).toEqual(expect.arrayContaining(ORIGINALITY_RULES));
      expect(stagesFor(template, {}).length).toBeGreaterThan(0);
    }
  });

  it("research carries the no-fabrication rules", () => {
    expect(research.integrityRules).toEqual(expect.arrayContaining(RESEARCH_INTEGRITY_RULES));
    expect(stagesFor(research, researchInputs)).toHaveLength(8);
  });

  it("books are generated chapter by chapter", () => {
    const stages = stagesFor(book, { chapterCount: "4" });
    expect(stages.map((s) => s.id)).toEqual([
      "front-matter",
      "chapter-1",
      "chapter-2",
      "chapter-3",
      "chapter-4",
      "back-matter",
    ]);
    expect(stagesFor(book, { chapterCount: "500" }).length).toBeLessThanOrEqual(32);
  });

  it("CV template has no preloaded personal data", () => {
    for (const field of cv.fields) {
      if (field.personalData) expect(field.defaultValue).toBeUndefined();
      const text = JSON.stringify(field);
      expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
      expect(text).not.toMatch(/\+?\d[\d\s-]{8,}\d/);
    }
    const defaults = withDefaults(cv, {});
    for (const field of cv.fields.filter((f) => f.personalData)) {
      expect(defaults[field.id]).toBeUndefined();
    }
  });
});

describe("guided intake", () => {
  it("asks for the next missing required detail and skips answered ones", () => {
    const first = nextIntakeField(lesson, { subject: "Science", level: "Basic 8" });
    expect(first?.id).toBe("topic");
    expect(upfrontFields(lesson).map((f) => f.id)).toEqual(
      expect.arrayContaining(["subject", "level", "topic", "duration", "approach", "assessment"])
    );
  });

  it("reports missing required fields before confirmation", () => {
    expect(missingRequired(lesson, { subject: "Science" }).map((f) => f.id)).toContain("topic");
    const full = withDefaults(lesson, {
      subject: "Science",
      level: "Basic 8",
      topic: "Photosynthesis",
      duration: "60 minutes",
      approach: ["Inquiry-based learning"],
      assessment: ["Oral questions"],
    });
    expect(missingRequired(lesson, full)).toEqual([]);
  });

  it("normalises numbered choice replies", () => {
    const level = lesson.fields.find((f) => f.id === "level")!;
    const answer = normalizeAnswer(level, "2");
    expect(answer).toEqual({ ok: true, value: level.options![1] });
  });
});

describe("research integrity gate", () => {
  const stages = stagesFor(research, researchInputs);
  const methodology = stages.find((s) => s.id === "methodology")!;
  const results = stages.find((s) => s.id === "results")!;
  const discussion = stages.find((s) => s.id === "discussion")!;

  it("asks for the real sample size before writing methodology — even in demo mode", () => {
    for (const demonstrationData of [false, true]) {
      const readiness = stageReadiness(research, methodology, researchInputs, { demonstrationData, sections: [] });
      expect(readiness.ready).toBe(false);
      if (!readiness.ready) {
        expect(readiness.message).toMatch(/I need your actual sample size/);
      }
    }
    const ready = stageReadiness(
      research,
      methodology,
      { ...researchInputs, sampleSize: "80", samplingProcedure: "Simple random", instruments: "Questionnaire" },
      { demonstrationData: false, sections: [] }
    );
    expect(ready.ready).toBe(true);
  });

  it("refuses results without collected data unless demonstration data is chosen", () => {
    expect(stageReadiness(research, results, researchInputs, { demonstrationData: false, sections: [] }).ready).toBe(false);
    expect(stageReadiness(research, results, researchInputs, { demonstrationData: true, sections: [] }).ready).toBe(true);
  });

  it("discussion depends on findings", () => {
    expect(stageReadiness(research, discussion, researchInputs, { demonstrationData: false, sections: [] }).ready).toBe(
      false
    );
    expect(
      stageReadiness(research, discussion, researchInputs, {
        demonstrationData: false,
        sections: [section("results")],
      }).ready
    ).toBe(true);
  });

  it("always labels demonstration sections", () => {
    const labelled = finalizeStageContent("## Results\nTable 1…", { stage: results, demonstrationData: true });
    expect(labelled).toContain(DEMONSTRATION_LABEL);
    const prompt = buildStagePrompt({
      template: research,
      inputs: researchInputs,
      stage: results,
      previousSections: [],
      demonstrationData: true,
      sourceReferences: [],
    });
    expect(prompt.prompt).toContain(DEMONSTRATION_LABEL);
    expect(finalizeStageContent("## Intro", { stage: stages[0]!, demonstrationData: true })).not.toContain(
      DEMONSTRATION_LABEL
    );
  });
});

describe("prompts and provenance", () => {
  const inputs: CreationInputs = {
    subject: "Science",
    level: "Basic 8",
    topic: "Photosynthesis",
    strand: "Diversity of Matter",
    curriculumIssuer: "Ghana Education Service / Ministry of Education (CCP)",
    [STRUCTURE_INPUT_KEY]: "Introduction\nMain activities",
  };

  it("sends originality rules and the structure only as headings", () => {
    const refs = deriveSourceReferences(lesson, inputs);
    const { prompt, context } = buildStagePrompt({
      template: lesson,
      inputs,
      stage: stagesFor(lesson, inputs)[0]!,
      previousSections: [],
      demonstrationData: false,
      sourceReferences: refs,
    });
    for (const rule of ORIGINALITY_RULES) expect(context).toContain(rule);
    expect(prompt).toContain("headings only");
    expect(prompt).toContain("Photosynthesis");
    expect(prompt).not.toMatch(/copyright[- ]free/i);
  });

  it("labels curriculum-based lessons and attributes the source without endorsement claims", () => {
    const refs = deriveSourceReferences(lesson, inputs);
    expect(provenanceLabel(lesson, refs)).toBe(
      "Original Giga3-generated lesson based on the selected curriculum reference."
    );
    const document = assembleDocument(lesson, [section("lesson", "## Lesson")], refs);
    expect(document).toContain("Ghana Education Service / Ministry of Education (CCP) curriculum reference supplied by user");
    expect(document).toContain(NOT_ENDORSED_NOTE);
    expect(document).not.toMatch(/copyright[- ]free|approved by (GES|NaCCA)/i);
  });

  it("records provenance without storing section bodies", () => {
    const provenance = buildProvenance({
      template: research,
      inputs: researchInputs,
      sections: [section("introduction", "secret body")],
      sourceReferences: [],
      createdAt: 1,
    });
    expect(provenance.generationType).toBe("research");
    expect(provenance.originalContent).toBe(true);
    expect(provenance.citationsRequested).toBe(true);
    expect(JSON.stringify(provenance.generatedSections)).not.toContain("secret body");
  });
});

describe("reference analyzer", () => {
  const sample = [
    "CHAPTER ONE",
    "INTRODUCTION",
    "1.1 Background to the Study",
    "The quick brown fox is a very distinctive sentence written by someone else about fishing in Keta lagoon.",
    "1.2 Statement of the Problem",
    "Research Questions",
    "CHAPTER THREE",
    "METHODOLOGY",
    "3.4 Sample and Sampling Procedure",
    "Contact: kofi.mensah@example.com, 024 123 4567",
  ].join("\n");

  it("returns only canonical headings, never source text or personal data", () => {
    const analysis = analyzeReferenceDocument(sample);
    expect(analysis.documentType).toBe("research");
    expect(analysis.headings).toEqual(
      expect.arrayContaining(["Introduction", "Background to the study", "Statement of the problem", "Methodology"])
    );
    expect(analysis.personalDataFound).toEqual(expect.arrayContaining(["email", "phone"]));
    const serialised = JSON.stringify(analysis);
    expect(serialised).not.toContain("quick brown fox");
    expect(serialised).not.toContain("kofi.mensah");
    expect(serialised).not.toContain("123 4567");
  });

  it("extracts short curriculum fields and indicator codes", () => {
    const analysis = analyzeReferenceDocument(
      "Strand: Diversity of Matter\nSub-strand: Materials\nContent Standard: B8.1.1.1 Recognise materials\nIndicator: B8.1.1.1.2 Classify materials\nLesson"
    );
    expect(analysis.documentType).toBe("lesson");
    expect(analysis.curriculumFields.strand).toBe("Diversity of Matter");
    expect(analysis.curriculumFields.subStrand).toBe("Materials");
    expect(analysis.indicatorCodes).toEqual(expect.arrayContaining(["B8.1.1.1", "B8.1.1.1.2"]));
  });
});

describe("builder deep links", () => {
  it("round-trips lesson details and never serialises CV personal data", () => {
    const link = buildCreationLink("lesson", { subject: "Science", assessment: ["A", "B"] }, { step: "confirm" });
    const parsed = parseCreationLink(new URL(link, "https://www.giga3ai.com").searchParams);
    expect(parsed).toEqual({ templateId: "lesson", inputs: { subject: "Science", assessment: ["A", "B"] }, step: "confirm" });

    const cvLink = buildCreationLink("cv", {
      fullName: "Ama Owusu",
      contact: "ama@example.com, 0241234567",
      professionalTitle: "Teacher",
    });
    expect(cvLink).not.toContain("Ama");
    expect(cvLink).not.toContain("example.com");
    expect(cvLink).toContain("Teacher");
  });

  it("rejects unknown templates", () => {
    expect(parseCreationLink(new URLSearchParams("template=essay"))).toBeNull();
  });
});
