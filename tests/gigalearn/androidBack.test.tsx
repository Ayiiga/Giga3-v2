/** @vitest-environment happy-dom */

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { StrictMode, act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { actionMock } = vi.hoisted(() => ({ actionMock: vi.fn() }));

vi.mock("@/lib/gigalearn/speechSynthesis", () => ({
  speakPronunciationSequence: vi.fn(async () => true),
  stopGigaLearnVoice: vi.fn(),
}));
vi.mock("@/components/chat/MessageMarkdown", () => ({
  MessageMarkdown: ({ content }: { content: string }) => createElement("div", null, content),
}));
vi.mock("@/components/creator-studio/CreatorResultPanel", () => ({
  CreatorResultPanel: ({ content }: { content: string }) => createElement("pre", null, content),
}));
vi.mock("@/components/billing/CreditPromptLinks", () => ({ CreditPromptLinks: () => null }));
vi.mock("@/lib/gigalearn/workspace", () => ({
  saveArtifact: vi.fn(),
  canGenerateToday: () => true,
  recordLearningActivity: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getSessionToken: () => "session-token" }));
// The hook resolves convex from web/node_modules, not the repo root.
vi.mock("../../web/node_modules/convex/dist/esm/react/index.js", () => ({ useAction: () => actionMock }));
vi.mock("convex/_generated/api", () => ({ api: { gigalearnStudio: { generateContent: "gigalearnStudio:generateContent" } } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/gigalearn/",
}));

import { CreationStudio } from "../../web/components/gigalearn/creation/CreationStudio";
import { GigaRhymesPanel } from "../../web/components/gigalearn/rhymes/GigaRhymesPanel";
import { getCreationTemplate } from "../../web/lib/gigalearn/creation/templates";
import { useCreationGeneration } from "../../web/hooks/useCreationGeneration";
import { GIGA_RHYMES } from "../../web/lib/gigalearn/rhymes/library";

let root: Root | null = null;
let host: HTMLDivElement;
let stack: unknown[] = [];
let backSpy: ReturnType<typeof vi.spyOn>;
let pushSpy: ReturnType<typeof vi.spyOn>;

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

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 5));
  });
}

/** Android Back: the browser moves to the previous entry and fires popstate. */
async function pressBack() {
  await act(async () => {
    window.history.back();
    await new Promise((resolve) => setTimeout(resolve, 5));
  });
}

beforeEach(() => {
  const realReplace = window.history.replaceState.bind(window.history);
  realReplace({ base: true }, "");
  stack = [{ base: true }];
  pushSpy = vi.spyOn(window.history, "pushState").mockImplementation((state: unknown) => {
    stack.push(state);
    realReplace(state, "");
  });
  backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {
    if (stack.length > 1) stack.pop();
    realReplace(stack[stack.length - 1], "");
    setTimeout(() => window.dispatchEvent(new PopStateEvent("popstate", { state: stack[stack.length - 1] })), 0);
  });
  localStorage.clear();
  actionMock.mockReset();
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  host?.remove();
  pushSpy.mockRestore();
  backSpy.mockRestore();
});

describe("Android Back inside GigaLearn", () => {
  const first = GIGA_RHYMES[0]!;

  it("closes an open rhyme instead of leaving GigaLearn", async () => {
    render(createElement(GigaRhymesPanel));
    await click(button(new RegExp(first.title)));
    expect(host.textContent).toContain("Learning objective");
    expect(stack).toHaveLength(2);

    await click(button("Next rhyme"));
    expect(stack).toHaveLength(2);

    await pressBack();
    expect(host.textContent).toContain("practised");
    expect(host.textContent).not.toContain("Learning objective");
    expect(stack).toHaveLength(1);
    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it("closing a rhyme from the UI removes its history entry", async () => {
    render(createElement(GigaRhymesPanel));
    await click(button(new RegExp(first.title)));
    await click(button("All rhymes"));
    await settle();
    expect(stack).toHaveLength(1);
    expect(host.textContent).toContain("practised");
  });

  it("returns from a builder to the template library, one entry per open", async () => {
    render(createElement(CreationStudio, { credits: 10 }));
    await click(button(/Lesson Builder/));
    expect(host.textContent).toContain("Question 1 of");
    expect(stack).toHaveLength(2);
    await pressBack();
    expect(host.textContent).toContain("Template library");
    expect(stack).toHaveLength(1);

    await click(button(/Start from a reference/));
    expect(stack).toHaveLength(2);
    await click(button(/All templates|Back/));
    await settle();
    expect(host.textContent).toContain("Template library");
    expect(stack).toHaveLength(1);
  });

  it("StrictMode remounts keep a single entry and the view stays open", async () => {
    render(createElement(StrictMode, null, createElement(GigaRhymesPanel)));
    await click(button(new RegExp(first.title)));
    await settle();
    expect(stack).toHaveLength(2);
    expect(host.textContent).toContain("Learning objective");
    await pressBack();
    expect(host.textContent).not.toContain("Learning objective");
    expect(stack).toHaveLength(1);
  });
});

describe("creation generation while offline", () => {
  it("refuses to send, explains why, and sends once back online", async () => {
    const lesson = getCreationTemplate("lesson")!;
    let api: ReturnType<typeof useCreationGeneration> | null = null;
    function Probe() {
      api = useCreationGeneration();
      return createElement("p", null, api.error ?? "");
    }
    render(createElement(Probe));
    const args = {
      template: lesson,
      inputs: { topic: "Photosynthesis" },
      stage: lesson.stages[0]!,
      previousSections: [],
      demonstrationData: false,
      sourceReferences: [],
    };
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    let result: unknown = "unset";
    await act(async () => {
      result = await api!.generateStage(args);
    });
    expect(result).toBeNull();
    expect(actionMock).not.toHaveBeenCalled();
    expect(host.textContent).toContain("You're offline");

    online.mockReturnValue(true);
    actionMock.mockResolvedValue({ content: "## Lesson\nBody", provider: "test" });
    await act(async () => {
      result = await api!.generateStage(args);
    });
    expect(actionMock).toHaveBeenCalledTimes(1);
    expect(result).not.toBeNull();
    online.mockRestore();
  });
});
