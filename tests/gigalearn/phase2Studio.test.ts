/** @vitest-environment happy-dom */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  checkCombination,
  getSubjectsForLevel,
} from "../../web/lib/gigalearn/curriculumEngine";
import {
  deckIdFor,
  markCardMastered,
  parseFlashcards,
  shuffleCards,
} from "../../web/lib/gigalearn/flashcards";
import {
  buildRepurposePrompt,
  extractNarrationScript,
  REPURPOSE_TARGETS,
  repurposeTargetsFor,
} from "../../web/lib/gigalearn/repurpose";
import {
  parseResourceSearch,
  searchResources,
} from "../../web/lib/gigalearn/resourceSearch";
import {
  clearStudioContext,
  getStudioContext,
  saveStudioContext,
  studioContextIds,
  studioContextSummary,
  studioTopicKey,
  validateStudioContext,
} from "../../web/lib/gigalearn/studioContext";
import {
  AI_PRACTICE_LABEL,
  CAREER_TECH_PRACTICAL_AREAS,
  CAREER_TECH_SAFETY_NOTE,
  getStudioTool,
  QUIZ_QUESTION_TYPES,
  studioToolsFor,
} from "../../web/lib/gigalearn/studioTools";
import {
  getTeacherAnalytics,
  listArtifacts,
  recordLearningActivity,
  saveArtifact,
} from "../../web/lib/gigalearn/workspace";
import { GIGALEARN_SECTIONS } from "../../web/lib/gigalearn/sections";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

beforeEach(() => {
  localStorage.clear();
});

describe("Phase 2 studio context persistence", () => {
  it("defaults to a valid Ghana CCP context", () => {
    const ctx = getStudioContext();
    expect(ctx.countryId).toBe("ghana");
    expect(validateStudioContext(ctx).valid).toBe(true);
  });

  it("persists strand, topic and standards across workflows", () => {
    saveStudioContext({
      levelId: "basic-8",
      subjectId: "career-technology",
      strand: "Design",
      subStrand: "Planning",
      topic: "Materials",
      contentStandard: "CS-1",
      indicator: "IN-1",
    });
    const reloaded = getStudioContext();
    expect(reloaded.subjectId).toBe("career-technology");
    expect(reloaded.strand).toBe("Design");
    expect(reloaded.topic).toBe("Materials");
    expect(reloaded.contentStandard).toBe("CS-1");
    expect(validateStudioContext(reloaded).valid).toBe(true);
  });

  it("sanitizes incompatible stored combinations (never stale)", () => {
    localStorage.setItem(
      "giga3_gigalearn_studio_context",
      JSON.stringify({
        countryId: "ghana",
        curriculumId: "gh-ccp",
        levelId: "kg-1",
        subjectId: "career-technology",
        strand: "",
        subStrand: "",
        topic: "",
      })
    );
    const ctx = getStudioContext();
    expect(ctx.subjectId).toBe("");
    expect(validateStudioContext(ctx).valid).toBe(false);
  });

  it("rejects unknown country, wrong-curriculum grade and KG×Career Tech", () => {
    expect(
      validateStudioContext({ ...getStudioContext(), countryId: "atlantis" }).issues.length
    ).toBeGreaterThan(0);
    expect(
      validateStudioContext({ ...getStudioContext(), levelId: "basic-11" }).issues.some((i) =>
        i.includes("not part of the selected curriculum")
      )
    ).toBe(true);
    const bad = validateStudioContext({
      ...getStudioContext(),
      levelId: "kg-1",
      subjectId: "career-technology",
    });
    expect(bad.valid).toBe(false);
    expect(bad.issues.join(" ")).toContain("not compatible");
  });

  it("summarizes the breadcrumb and keys analytics by stable IDs", () => {
    const ctx = saveStudioContext({
      levelId: "basic-8",
      subjectId: "career-technology",
      strand: "Design",
      subStrand: "Planning",
      topic: "Materials",
    });
    expect(studioContextSummary(ctx).join(" · ")).toContain("Career Technology");
    expect(studioContextSummary(ctx)).toContain("Materials");
    const ids = studioContextIds(ctx);
    expect(ids.subjectId).toBe("career-technology");
    expect(ids.levelId).toBe("basic-8");
    expect(ids.gradeId).toBe("Basic 8");
    expect(studioTopicKey(ctx)).toBe("gh-ccp/career-technology/basic-8/materials");
    expect(clearStudioContext().topic).toBe("");
  });
});

describe("Phase 2 studio tool registry (no second curriculum model)", () => {
  it("covers all Teacher Studio tools from the spec", () => {
    const labels = studioToolsFor("teacher").map((t) => t.label);
    for (const expected of [
      "Lesson Generator",
      "Lesson Notes",
      "Quiz Generator",
      "Assignment Generator",
      "Worksheet Generator",
      "Assessment Generator",
      "Presentation Generator",
      "Video Lesson Generator",
      "Teaching Aid Generator",
      "Practical Activity Generator",
      "BECE / Exam Prep",
    ]) {
      expect(labels).toContain(expected);
    }
  });

  it("serves student Learn Mode tools including flashcards", () => {
    const ids = studioToolsFor("student").map((t) => t.id);
    expect(ids).toContain("topic-explainer");
    expect(ids).toContain("quiz-generator");
    expect(ids).toContain("revision-guide");
    expect(ids).toContain("flashcard-generator");
    expect(ids).toContain("bece-mock");
  });

  it("resolves backend tool ids and never duplicates subject lists", () => {
    expect(getStudioTool("presentation-generator")?.backendToolId).toBe("presentation-generator");
    expect(getStudioTool("bece-mock")?.label).toBe("BECE / Exam Prep");
    const src = read("web/lib/gigalearn/studioTools.ts");
    expect(src).not.toContain("SUBJECTS");
    expect(src).not.toContain("English Language");
    expect(src).not.toContain("Mathematics");
  });

  it("supports every spec question type and labels AI practice honestly", () => {
    for (const expected of [
      "Multiple choice",
      "True/False",
      "Short answer",
      "Structured questions",
      "Matching",
      "Fill in the blank",
      "Scenario-based questions",
      "Practical questions",
    ]) {
      expect(QUIZ_QUESTION_TYPES).toContain(expected);
    }
    expect(AI_PRACTICE_LABEL).toBe("AI-generated practice question");
  });

  it("specializes Career Technology with safety-first practical support", () => {
    for (const area of ["Tools", "Materials", "Safety", "Design", "Construction", "Textiles", "Entrepreneurship"]) {
      expect(CAREER_TECH_PRACTICAL_AREAS).toContain(area);
    }
    expect(CAREER_TECH_SAFETY_NOTE).toContain("safety requirements");
    expect(CAREER_TECH_SAFETY_NOTE).toContain("teacher/supervisor oversight");
  });
});

describe("Phase 2 backend generation contracts", () => {
  const backend = () => read("convex/gigalearnStudio.ts");

  it("structures full lessons (overview, development, teacher support)", () => {
    expect(backend()).toContain("## Lesson Overview");
    expect(backend()).toContain("## Lesson Development");
    expect(backend()).toContain("## Teacher Support");
    expect(backend()).toContain("Possible misconceptions");
    expect(backend()).toContain("Differentiation ideas");
    expect(backend()).toContain("Previous knowledge");
    expect(backend()).toContain("Guided practice");
  });

  it("makes quizzes/assessments curriculum-aware with marks and guides", () => {
    expect(backend()).toContain("marks");
    expect(backend()).toContain("marking guide");
    expect(backend()).toContain("Scenario-based");
    expect(backend()).toContain('"AI-generated practice question"');
    expect(backend()).toContain("Never describe AI-generated questions as official WAEC/BECE questions");
  });

  it("covers assignments, worksheets, presentations, video, flashcards and aids", () => {
    expect(backend()).toContain("Submission guidance");
    expect(backend()).toContain("answer section");
    expect(backend()).toContain("Title slide");
    expect(backend()).toContain("Scene breakdown");
    expect(backend()).toContain("Narration");
    expect(backend()).toContain("Captions");
    expect(backend()).toContain("Visual suggestions");
    expect(backend()).toContain("Front (question / term / concept)");
    expect(backend()).toContain("low-cost teaching aids");
  });

  it("requires safety content for practical and Career Technology work", () => {
    expect(backend()).toContain("safety checklist");
    expect(backend()).toContain("materials checklist");
    expect(backend()).toContain("teacher demonstration script");
    expect(backend()).toContain("appropriate teacher/supervisor oversight");
  });

  it("flows content standard, indicator and subject specificity into prompts", () => {
    expect(backend()).toContain("contentStandard");
    expect(backend()).toContain("indicator");
    expect(backend()).toContain("Content Standard:");
    expect(backend()).toContain("Treat the selected subject as exact context");
    expect(backend()).toContain("bece-mock");
    expect(backend()).toContain("assessment-generator");
    expect(backend()).toContain("video-script-generator");
    expect(backend()).toContain("flashcard-generator");
  });

  it("generation hook resolves studio tools and saves ID-tagged artifacts", () => {
    const hook = read("web/hooks/useGigaLearnGeneration.ts");
    expect(hook).toContain("getStudioTool");
    expect(hook).toContain("curriculumIds");
    expect(hook).toContain("resourceType");
    expect(hook).toContain("contentStandard");
  });
});

describe("Phase 2 content repurposing", () => {
  it("converts one lesson into every downstream format", () => {
    const ids = REPURPOSE_TARGETS.map((t) => t.id);
    for (const expected of [
      "lesson-notes",
      "quiz-generator",
      "worksheet-generator",
      "assignment-generator",
      "presentation-generator",
      "video-script-generator",
      "revision-guide",
      "flashcard-generator",
    ]) {
      expect(ids).toContain(expected);
    }
  });

  it("never offers the source format and carries stable IDs", () => {
    expect(repurposeTargetsFor("quiz-generator").some((t) => t.id === "quiz-generator")).toBe(false);
    const { prompt, backendToolId } = buildRepurposePrompt({
      sourceLabel: "Lesson Generator",
      targetId: "presentation-generator",
      sourceContent: "## Lesson\nPhotosynthesis facts",
      context: getStudioContext(),
    });
    expect(backendToolId).toBe("presentation-generator");
    expect(prompt).toContain("Photosynthesis facts");
    expect(prompt).toContain("ghana");
    expect(prompt).toContain("gh-ccp");
  });

  it("extracts narration for the GigaEdit teleprompter handoff", () => {
    const script = extractNarrationScript("## Title\nX\n## Narration\nHello learners\n## Captions\nY");
    expect(script).toContain("Hello learners");
    expect(script).not.toContain("## Captions");
  });
});

describe("Phase 2 curriculum-aware search", () => {
  it('parses "JHS 2 Career Technology materials"', () => {
    const q = parseResourceSearch("JHS 2 Career Technology materials");
    expect(q.levelId).toBe("basic-8");
    expect(q.subjectId).toBe("career-technology");
    expect(q.topicKeywords).toContain("materials");
  });

  it("ranks exact grade+subject matches first", () => {
    const resources = [
      { id: "a", title: "SHS Biology notes", content: "cells", kind: "notes", toolId: "lesson-notes", createdAt: 1 },
      {
        id: "b",
        title: "Career Technology lesson",
        content: "materials for class",
        kind: "notes",
        toolId: "lesson-generator",
        subjectId: "career-technology",
        levelId: "basic-8",
        createdAt: 2,
      },
    ];
    const q = parseResourceSearch("JHS 2 Career Technology materials");
    expect(searchResources(q, resources)[0]?.id).toBe("b");
  });
});

describe("Phase 2 flashcards", () => {
  const sample = "1. Front: What is photosynthesis?\nBack: How plants make food.\n2. Front: Chlorophyll\nBack: Green pigment.";

  it("parses Front/Back pairs and tracks mastery per deck", () => {
    const cards = parseFlashcards(sample);
    expect(cards).toHaveLength(2);
    expect(cards[0]?.front).toContain("photosynthesis");
    expect(cards[0]?.back).toContain("make food");
    const deck = deckIdFor("Photosynthesis", "science", "basic-8");
    expect(markCardMastered(deck, cards[0]!.id)).toContain(cards[0]!.id);
    expect(shuffleCards(cards).map((c) => c.id).sort()).toEqual(cards.map((c) => c.id).sort());
  });
});

describe("Phase 2 ID-based progress and teacher analytics", () => {
  it("records subjects by stable id and topic history", () => {
    recordLearningActivity({ toolId: "quiz-generator", subject: "Career Technology", subjectId: "career-technology", gradeId: "Basic 8", topic: "Materials" });
    const again = recordLearningActivity({ toolId: "lesson-generator", subjectId: "career-technology", gradeId: "Basic 8", topic: "Tools" });
    expect(again.subjectsById["career-technology"]).toBe(2);
    expect(again.topicsStudied[0]).toMatchObject({ subjectId: "career-technology", topic: "Tools" });
  });

  it("aggregates the teacher dashboard from own resources", () => {
    saveArtifact({ toolId: "quiz-generator", title: "Q", prompt: "p", content: "c", curriculumIds: { subjectId: "career-technology" } });
    saveArtifact({ toolId: "assignment-generator", title: "A", prompt: "p", content: "c" });
    const analytics = getTeacherAnalytics();
    expect(analytics.resourcesCreated).toBe(2);
    expect(analytics.quizzesCreated).toBe(1);
    expect(analytics.assignmentsCreated).toBe(1);
    expect(listArtifacts()).toHaveLength(2);
  });
});

describe("Phase 2 UI wiring", () => {
  it("adds studio, learn and library sections without removing Phase 1 tabs", () => {
    const ids = GIGALEARN_SECTIONS.map((s) => s.id);
    for (const expected of ["student", "teacher", "parent", "homework", "create", "rhymes", "workspace", "studio", "learn", "library"]) {
      expect(ids).toContain(expected);
    }
  });

  it("Teacher Studio keeps context visible with the full action set", () => {
    const src = read("web/components/gigalearn/TeacherStudio.tsx");
    expect(src).toContain("Change curriculum");
    expect(src).toContain("Number of questions");
    expect(src).toContain("Question types");
    for (const action of ["Edit", "Regenerate", "Expand", "Simplify", "Translate", "Export", "Print", "Repurpose", "To presentation", "To video"]) {
      expect(src).toContain(action);
    }
    expect(src).toContain("CurriculumSelector");
    expect(src).toContain("FlashcardStudy");
    expect(src).toContain("PracticeSession");
    expect(src).toContain("saveTeleprompterScript");
    expect(src).toContain("/gigaedit");
    expect(src).toContain("studioTopicKey");
  });

  it("Learn Mode offers six actions plus Ask AI with grade adaptation", () => {
    const src = read("web/components/gigalearn/StudentMode.tsx");
    for (const label of ["Explain", "Simplify", "Examples", "Practice", "Quiz", "Revision", "Ask AI about this topic"]) {
      expect(src).toContain(label);
    }
    expect(src).toContain("Explain it in simple language");
    expect(src).toContain("Test me");
    expect(src).toContain("Help me revise");
    expect(src).toContain("CurriculumSelector");
  });

  it("Library filters by curriculum IDs with search and analytics", () => {
    const src = read("web/components/gigalearn/ResourceLibrary.tsx");
    for (const label of ["Subject", "Grade", "Curriculum", "Content type", "Date"]) {
      expect(src).toContain(label);
    }
    expect(src).toContain("JHS 2 Career Technology materials");
    expect(src).toContain("Resources created");
    expect(src).toContain("curriculumIds");
    expect(src).toContain("Repurpose");
  });

  it("GigaLearn shell renders the new Phase 2 sections", () => {
    const src = read("web/components/gigalearn/GigaLearnClient.tsx");
    expect(src).toContain("TeacherStudio");
    expect(src).toContain("StudentMode");
    expect(src).toContain("ResourceLibrary");
  });
});

describe("Phase 1 regression (PR #441 intact)", () => {
  it("keeps the JHS hierarchy with Computing and Career Technology", () => {
    const ids = getSubjectsForLevel("basic-8").map((s) => s.id);
    expect(ids).toContain("computing");
    expect(ids).toContain("career-technology");
    expect(ids).not.toContain("coding");
    expect(checkCombination("kg-1", "career-technology").valid).toBe(false);
  });
});
