/** @vitest-environment happy-dom */

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { generateStageMock, searchParams, replaceMock } = vi.hoisted(() => ({
  generateStageMock: vi.fn(),
  searchParams: { current: new URLSearchParams() },
  replaceMock: vi.fn(),
}));

vi.mock("@/hooks/useCreationGeneration", () => ({
  useCreationGeneration: () => ({
    generateStage: generateStageMock,
    loading: false,
    error: null,
    clearError: () => undefined,
  }),
}));

vi.mock("@/components/chat/MessageMarkdown", () => ({
  MessageMarkdown: ({ content }: { content: string }) => createElement("div", { "data-testid": "md" }, content),
}));

vi.mock("@/components/creator-studio/CreatorResultPanel", () => ({
  CreatorResultPanel: ({ content }: { content: string }) => createElement("pre", { "data-testid": "document" }, content),
}));

vi.mock("@/components/billing/CreditPromptLinks", () => ({
  CreditPromptLinks: () => createElement("p", { "data-testid": "credit-prompt" }, "Need credits"),
}));

vi.mock("@/lib/gigalearn/workspace", () => ({ saveArtifact: vi.fn() }));

vi.mock("@/lib/gigalearn/speechSynthesis", () => ({
  speakPronunciationSequence: vi.fn(async () => true),
  stopGigaLearnVoice: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
  useSearchParams: () => searchParams.current,
  usePathname: () => "/gigalearn/",
}));

import { CreationBuilder } from "../../web/components/gigalearn/creation/CreationBuilder";
import { CreationStudio } from "../../web/components/gigalearn/creation/CreationStudio";
import { DEMONSTRATION_LABEL } from "../../web/lib/gigalearn/creation/prompts";
import { markCreationAutostart } from "../../web/lib/gigalearn/creation/links";
import { getCreationTemplate } from "../../web/lib/gigalearn/creation/templates";
import type { CreationInputs } from "../../web/lib/gigalearn/creation/types";

const lesson = getCreationTemplate("lesson")!;
const research = getCreationTemplate("research")!;

const LESSON_INPUTS: CreationInputs = {
  subject: "Science",
  level: "Basic 8",
  topic: "Photosynthesis",
  duration: "60 minutes",
  approach: "Inquiry-based learning",
  assessment: ["Oral questions"],
  documentKind: "Lesson plan",
};

let root: Root | null = null;
let host: HTMLDivElement;

function render(element: React.ReactElement) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(element));
}

function button(label: string | RegExp): HTMLButtonElement {
  const match = [...host.querySelectorAll("button")].find((candidate) =>
    typeof label === "string" ? candidate.textContent?.trim() === label : label.test(candidate.textContent ?? "")
  );
  if (!match) throw new Error(`Missing button ${label}`);
  return match as HTMLButtonElement;
}

async function click(element: Element) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function typeInto(element: HTMLTextAreaElement | HTMLInputElement, value: string) {
  const proto = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => {
  generateStageMock.mockReset();
  generateStageMock.mockImplementation(async ({ stage, demonstrationData }) => ({
    stageId: stage.id,
    label: stage.label,
    content: `## ${stage.label}\nGenerated body`,
    generatedAt: Date.now(),
    demonstrationData: Boolean(demonstrationData && (stage.userDataStage || stage.dependsOnFindings)),
  }));
  localStorage.clear();
  sessionStorage.clear();
  searchParams.current = new URLSearchParams();
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  host?.remove();
});

describe("CreationBuilder confirmation workflow", () => {
  it("never generates before the user confirms", async () => {
    render(
      createElement(CreationBuilder, {
        template: lesson,
        initialInputs: LESSON_INPUTS,
        initialStep: "confirm",
        credits: 50,
        onExit: () => undefined,
      })
    );
    expect(host.textContent).toContain("Ready to Generate");
    expect(host.textContent).toContain("Does this information look correct?");
    expect(host.textContent).toContain("Photosynthesis");
    button(/Confirm & Generate/);
    button(/Edit Details/);
    button(/Start Over/);
    expect(generateStageMock).not.toHaveBeenCalled();

    await click(button(/Edit Details/));
    expect(host.textContent).toContain("Edit details");
    expect(generateStageMock).not.toHaveBeenCalled();
    await click(button(/Save details/));
    expect(host.textContent).toContain("Ready to Generate");

    await click(button(/Confirm & Generate/));
    expect(generateStageMock).toHaveBeenCalledTimes(1);
    expect(host.querySelector("[data-testid=md]")?.textContent).toContain("Generated body");
    expect(host.querySelector("[data-testid=document]")?.textContent).toContain(
      "Original Giga3-generated lesson"
    );
  });

  it("guided intake asks one question at a time and requires answers", async () => {
    render(createElement(CreationBuilder, { template: lesson, credits: 50, onExit: () => undefined }));
    expect(host.textContent).toContain("Question 1 of");
    await click(button("Next"));
    expect(host.querySelector("[role=alert]")).not.toBeNull();
    expect(generateStageMock).not.toHaveBeenCalled();
  });

  it("blocks confirmation when credits are too low, even with autostart", async () => {
    render(
      createElement(CreationBuilder, {
        template: lesson,
        initialInputs: LESSON_INPUTS,
        initialStep: "confirm",
        autostart: true,
        credits: 1,
        onExit: () => undefined,
      })
    );
    expect(button(/Confirm & Generate/).disabled).toBe(true);
    expect(generateStageMock).not.toHaveBeenCalled();
  });

  it("research: asks for real methodology data and labels demonstration results", async () => {
    render(
      createElement(CreationBuilder, {
        template: research,
        initialInputs: {
          topic: "Reading habits",
          problem: "Declining reading time",
          studyArea: "Ho",
          population: "JHS 2 learners",
          academicLevel: "Diploma",
          design: "Descriptive survey",
        },
        initialStep: "confirm",
        credits: 100,
        onExit: () => undefined,
      })
    );
    await click(button(/Confirm & Generate/));
    expect(host.textContent).toContain("Stage 1 of 8");
    // Stages 2 and 3 (objectives, literature) generate on Continue.
    await click(button("Continue"));
    await click(button("Continue"));
    await click(button("Continue"));
    expect(host.textContent).toContain("Stage 4 of 8: Methodology");
    expect(host.textContent).toContain("I need your actual sample size");
    expect(generateStageMock).toHaveBeenCalledTimes(3);
    expect(button("Generate").disabled).toBe(true);

    for (const [id, value] of [
      ["sampleSize", "80"],
      ["samplingProcedure", "Simple random sampling"],
      ["instruments", "Questionnaire"],
    ] as const) {
      const field = host.querySelector(`#stage-${id}`) as HTMLInputElement | HTMLTextAreaElement | null;
      if (!field) throw new Error(`Missing stage field ${id}`);
      typeInto(field, value);
    }
    expect(button("Generate").disabled).toBe(false);
    await click(button("Generate"));
    expect(generateStageMock).toHaveBeenCalledTimes(4);

    await click(button("Continue"));
    expect(host.textContent).toContain("Stage 5 of 8: Results and analysis");
    expect(generateStageMock).toHaveBeenCalledTimes(4);
    expect(button("Generate").disabled).toBe(true);

    const demo = host.querySelector("input[type=checkbox]") as HTMLInputElement;
    await click(demo);
    await click(button("Generate"));
    expect(generateStageMock).toHaveBeenCalledTimes(5);
    expect(generateStageMock.mock.calls[4]![0].demonstrationData).toBe(true);
    expect(host.textContent).toContain(DEMONSTRATION_LABEL);

    // Sections built on demonstration findings stay labelled.
    await click(button("Continue"));
    expect(host.textContent).toContain("Stage 6 of 8: Discussion");
    expect(generateStageMock.mock.calls[5]![0].demonstrationData).toBe(true);
  });
});

describe("CreationBuilder mobile hardening", () => {
  const researchInputs: CreationInputs = {
    topic: "Reading habits",
    problem: "Declining reading time",
    studyArea: "Ho",
    population: "JHS 2 learners",
    academicLevel: "Diploma",
    design: "Descriptive survey",
  };

  function deferGeneration() {
    const pending: Array<() => void> = [];
    generateStageMock.mockImplementation(
      ({ stage }) =>
        new Promise((resolve) => {
          pending.push(() =>
            resolve({ stageId: stage.id, label: stage.label, content: `## ${stage.label}\nBody`, generatedAt: Date.now() })
          );
        })
    );
    return async () => {
      await act(async () => {
        pending.splice(0).forEach((finish) => finish());
      });
    };
  }

  it("two taps landing before a re-render send one generation request", async () => {
    const finish = deferGeneration();
    render(
      createElement(CreationBuilder, {
        template: research,
        initialInputs: researchInputs,
        initialStep: "confirm",
        credits: 100,
        onExit: () => undefined,
      })
    );
    const confirm = button(/Confirm & Generate/);
    await act(async () => {
      confirm.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      confirm.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(generateStageMock).toHaveBeenCalledTimes(1);
    await finish();

    const next = button("Continue");
    await act(async () => {
      next.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      next.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(generateStageMock).toHaveBeenCalledTimes(2);
    await finish();
    expect(host.textContent).toContain("Stage 2 of 8");

    // After a request settles, the next tap is accepted again.
    await click(button("Regenerate"));
    expect(generateStageMock).toHaveBeenCalledTimes(3);
    await finish();
  });

  it("Continue brings the next stage heading back on screen", async () => {
    const scrolled: string[] = [];
    const scrollSpy = vi
      .spyOn(HTMLElement.prototype, "scrollIntoView")
      .mockImplementation(function (this: HTMLElement) {
        scrolled.push(this.textContent ?? "");
      });
    const rectSpy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement
    ) {
      const top = this.tagName === "H3" ? -900 : 0;
      return { top, bottom: top + 30, left: 0, right: 0, width: 0, height: 30, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
    });
    try {
      render(
        createElement(CreationBuilder, {
          template: research,
          initialInputs: researchInputs,
          initialStep: "confirm",
          credits: 100,
          onExit: () => undefined,
        })
      );
      await click(button(/Confirm & Generate/));
      expect(scrolled).toEqual([]);
      await click(button("Continue"));
      expect(scrolled).toEqual(["Stage 2 of 8: Research objectives and questions"]);
      expect(document.activeElement?.textContent).toBe("Stage 2 of 8: Research objectives and questions");
    } finally {
      scrollSpy.mockRestore();
      rectSpy.mockRestore();
    }
  });

  it("Start Over deletes this build's saved draft and keeps unrelated drafts", async () => {
    const other = {
      id: "draft-unrelated",
      templateId: "book" as const,
      inputs: { title: "Rivers" },
      sections: [],
      sourceReferences: [],
      demonstrationData: false,
      provenance: { originalGiga3Content: true as const, createdAt: 1, sourceReferences: [], templateId: "book" as const, stagesGenerated: [] },
      createdAt: 1,
      updatedAt: 1,
    };
    localStorage.setItem("giga3_creation_drafts", JSON.stringify([other]));
    render(
      createElement(CreationBuilder, {
        template: research,
        initialInputs: researchInputs,
        initialStep: "confirm",
        credits: 100,
        onExit: () => undefined,
      })
    );
    await click(button(/Confirm & Generate/));
    await click(button("Save Draft"));
    const saved = () => JSON.parse(localStorage.getItem("giga3_creation_drafts") ?? "[]").map((d: { id: string }) => d.id);
    expect(saved()).toHaveLength(2);

    await click(button("Start Over"));
    expect(saved()).toHaveLength(2);
    await click(button("Tap again to start over"));
    expect(saved()).toEqual(["draft-unrelated"]);
    expect(host.textContent).toContain("Question 1 of");

    // Nothing generated after the reset, so leaving does not re-create the deleted draft.
    act(() => root?.unmount());
    root = null;
    expect(saved()).toEqual(["draft-unrelated"]);
  });

  it("leaving the builder (Android Back, tab switch) keeps generated stages as a device draft", async () => {
    render(
      createElement(CreationBuilder, {
        template: research,
        initialInputs: researchInputs,
        initialStep: "confirm",
        credits: 100,
        onExit: () => undefined,
      })
    );
    expect(localStorage.getItem("giga3_creation_drafts")).toBeNull();
    await click(button(/Confirm & Generate/));
    act(() => root?.unmount());
    root = null;
    const drafts = JSON.parse(localStorage.getItem("giga3_creation_drafts") ?? "[]");
    expect(drafts).toHaveLength(1);
    expect(drafts[0].templateId).toBe("research");
    expect(drafts[0].sections).toHaveLength(1);
  });

  it("leaving before anything is generated does not create a draft", () => {
    render(
      createElement(CreationBuilder, {
        template: lesson,
        initialInputs: LESSON_INPUTS,
        initialStep: "confirm",
        credits: 50,
        onExit: () => undefined,
      })
    );
    act(() => root?.unmount());
    root = null;
    expect(localStorage.getItem("giga3_creation_drafts")).toBeNull();
  });
});

describe("CreationStudio", () => {
  it("shows the template library and reference card", () => {
    render(createElement(CreationStudio, { credits: 10 }));
    for (const label of ["Lesson Builder", "Research Builder", "Book Builder", "CV Builder", "GigaRhymes", "Quiz Builder"]) {
      expect(host.textContent).toContain(label);
    }
    expect(host.textContent).toContain("Start from a reference");
  });

  it("deep link from chat opens the confirmation screen and autostarts only after chat confirmation", async () => {
    searchParams.current = new URLSearchParams(
      "tab=create&template=lesson&f_subject=Science&f_level=Basic+8&f_topic=Photosynthesis&f_duration=60+minutes&f_approach=Inquiry-based+learning&f_assessment=Oral+questions&step=confirm"
    );
    render(createElement(CreationStudio, { credits: 10 }));
    expect(host.textContent).toContain("Ready to Generate");
    expect(generateStageMock).not.toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalledWith("/gigalearn/?tab=create", { scroll: false });

    act(() => root?.unmount());
    host.remove();
    markCreationAutostart("lesson");
    render(createElement(CreationStudio, { credits: 10 }));
    await act(async () => undefined);
    expect(generateStageMock).toHaveBeenCalledTimes(1);
  });

  it("reference import keeps structure only and starts an original version", async () => {
    render(createElement(CreationStudio, { credits: 10 }));
    await click(button(/Start from a reference/));
    const textarea = host.querySelector("#reference-text") as HTMLTextAreaElement;
    typeInto(
      textarea,
      "CHAPTER ONE\nINTRODUCTION\nBackground to the Study\nA distinctive sentence about Keta lagoon fishermen written by another author.\nStatement of the Problem\nResearch Questions\nMETHODOLOGY\nEmail: someone@example.com"
    );
    await click(button("Analyse structure"));
    expect(host.textContent).toContain("Background to the study");
    expect(host.textContent).toContain("an email address");
    const analysisText = host.querySelector("[aria-live=polite]")?.textContent ?? "";
    expect(analysisText).not.toContain("Keta lagoon");
    expect(analysisText).not.toContain("someone@example.com");

    await click(button(/Create an original version from this structure/));
    expect(host.textContent).toMatch(/Research Builder/);
    expect(generateStageMock).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
  });
});

describe("demonstration label constant", () => {
  it("matches the required wording", () => {
    expect(DEMONSTRATION_LABEL).toBe("DEMONSTRATION DATA — NOT REAL RESEARCH FINDINGS");
  });
});
