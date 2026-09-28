/** @vitest-environment happy-dom */

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { speakMock } = vi.hoisted(() => ({
  speakMock: vi.fn(async (_parts: unknown, options?: { onEnd?: () => void }) => {
    options?.onEnd?.();
    return true;
  }),
}));

vi.mock("@/lib/gigalearn/speechSynthesis", () => ({
  speakPronunciationSequence: speakMock,
  speakWithGigaLearnVoice: vi.fn(async () => true),
  stopGigaLearnVoice: vi.fn(),
}));

vi.mock("@/lib/speech/loadBrowserVoices", () => ({
  warmUpBrowserVoices: vi.fn(),
}));

vi.mock("@/lib/gigalearn/offlineLessons", () => ({
  listOfflineLessons: vi.fn(async () => []),
}));

import { LowerGradesConcrete } from "../../web/components/gigalearn/LowerGradesConcrete";
import { buildItemPronunciationPlan } from "../../web/lib/gigalearn/pronunciation";
import { LEARN_FRUITS } from "../../convex/learnContent";

let root: Root | null = null;

function mount() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root?.render(createElement(LowerGradesConcrete));
  });
  return host;
}

function click(element: Element | null | undefined) {
  if (!element) throw new Error("Missing element to click");
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function byLabel(label: string): HTMLButtonElement {
  const button = [...document.querySelectorAll("button")].find(
    (element) => element.getAttribute("aria-label") === label
  );
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Missing button "${label}"`);
  return button;
}

function dialog() {
  return document.querySelector("[role='dialog']");
}

function position() {
  return document.querySelector("[data-testid='item-viewer-position']")?.textContent?.replace(/\s+/g, " ");
}

function transform() {
  return (document.querySelector("[data-testid='item-viewer-content']") as HTMLElement | null)?.style.transform ?? "";
}

function key(name: string, init: KeyboardEventInit = {}) {
  act(() => {
    (document.activeElement ?? window).dispatchEvent(
      new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true, ...init })
    );
  });
}

function touch(type: "touchstart" | "touchmove" | "touchend", points: Array<{ x: number; y: number }>) {
  const viewport = document.querySelector("[data-testid='item-viewer-viewport']");
  if (!viewport) throw new Error("Missing viewport");
  const list = points.map((point, identifier) => ({
    identifier,
    target: viewport,
    clientX: point.x,
    clientY: point.y,
  }));
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "touches", { value: type === "touchend" ? [] : list });
  Object.defineProperty(event, "changedTouches", { value: list });
  act(() => {
    viewport.dispatchEvent(event);
  });
}

function swipe(fromX: number, toX: number) {
  touch("touchstart", [{ x: fromX, y: 200 }]);
  touch("touchmove", [{ x: toX, y: 200 }]);
  touch("touchend", [{ x: toX, y: 200 }]);
}

function doubleTap() {
  touch("touchstart", [{ x: 150, y: 150 }]);
  touch("touchend", [{ x: 150, y: 150 }]);
  touch("touchstart", [{ x: 150, y: 150 }]);
  touch("touchend", [{ x: 150, y: 150 }]);
}

beforeEach(() => {
  speakMock.mockClear();
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

describe("GigaLearn full-screen item viewer", () => {
  it("opens Apple, moves Next to Banana and Previous back to Apple using the existing order", () => {
    mount();
    click(byLabel("Open Apple"));
    expect(dialog()).toBeTruthy();
    expect(dialog()?.textContent).toContain("Apple");
    expect(position()).toBe(`1 / ${LEARN_FRUITS.length}`);
    expect(dialog()?.textContent).toContain("Concrete");

    click(byLabel("Next Fruits item"));
    expect(dialog()?.textContent).toContain("Banana");
    expect(position()).toBe(`2 / ${LEARN_FRUITS.length}`);

    click(byLabel("Previous Fruits item"));
    expect(dialog()?.textContent).toContain("Apple");
    expect(byLabel("Previous Fruits item").disabled).toBe(true);
  });

  it("stops at the last item", () => {
    const host = mount();
    const fruitsSection = [...host.querySelectorAll("section")].find(
      (section) => section.querySelector("h3")?.textContent === "Fruits"
    )!;
    const next = [...fruitsSection.querySelectorAll("button")].find((b) => b.textContent === "Next")!;
    click(next);
    click(next);
    const last = LEARN_FRUITS[LEARN_FRUITS.length - 1]!;
    click(byLabel(`Open ${last.title}`));
    expect(position()).toBe(`${LEARN_FRUITS.length} / ${LEARN_FRUITS.length}`);
    expect(byLabel("Next Fruits item").disabled).toBe(true);
    key("ArrowRight");
    expect(position()).toBe(`${LEARN_FRUITS.length} / ${LEARN_FRUITS.length}`);
  });

  it("swipes left for next and right for previous when not zoomed", () => {
    mount();
    click(byLabel("Open Apple"));
    swipe(300, 100);
    expect(dialog()?.textContent).toContain("Banana");
    swipe(100, 300);
    expect(dialog()?.textContent).toContain("Apple");
    swipe(100, 300);
    expect(position()).toBe(`1 / ${LEARN_FRUITS.length}`);
  });

  it("double-tap zooms, zoomed swipes pan instead of navigating, and reset returns to fit", () => {
    mount();
    click(byLabel("Open Apple"));
    doubleTap();
    expect(transform()).toContain("scale(2.5)");
    swipe(300, 100);
    expect(dialog()?.textContent).toContain("Apple");
    expect(position()).toBe(`1 / ${LEARN_FRUITS.length}`);
    click(byLabel("Reset zoom"));
    expect(transform()).toContain("scale(1)");
  });

  it("pinch zooms with two fingers without changing the item", () => {
    mount();
    click(byLabel("Open Apple"));
    touch("touchstart", [{ x: 100, y: 100 }, { x: 140, y: 100 }]);
    touch("touchmove", [{ x: 60, y: 100 }, { x: 180, y: 100 }]);
    touch("touchend", [{ x: 60, y: 100 }]);
    expect(transform()).toMatch(/scale\(3\)/);
    expect(position()).toBe(`1 / ${LEARN_FRUITS.length}`);
  });

  it("a quick pinch back to fit, lifting one finger at a time, does not swipe to another item", () => {
    mount();
    click(byLabel("Open Apple"));
    touch("touchstart", [{ x: 200, y: 200 }]);
    touch("touchstart", [{ x: 200, y: 200 }, { x: 80, y: 200 }]);
    touch("touchmove", [{ x: 150, y: 200 }, { x: 130, y: 200 }]);
    // First finger lifts (pinch ends), the remaining finger lifts 100px left of its start.
    touch("touchend", [{ x: 130, y: 200 }]);
    touch("touchend", [{ x: 100, y: 200 }]);
    expect(position()).toBe(`1 / ${LEARN_FRUITS.length}`);
    expect(transform()).toContain("scale(1)");
  });

  it("Hear in the viewer uses the existing GigaLearn pronunciation pathway", () => {
    mount();
    click(byLabel("Open Apple"));
    const hear = [...dialog()!.querySelectorAll("button")].find((b) =>
      b.getAttribute("aria-label")?.startsWith("Pronounce Apple")
    );
    click(hear);
    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(speakMock.mock.calls[0]?.[0]).toEqual(buildItemPronunciationPlan("apple", "Apple", "english"));
  });

  it("Escape closes even while the Close button has focus, and focus returns to the card", async () => {
    mount();
    const opener = byLabel("Open Apple");
    click(opener);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Close item viewer");
    key("ArrowRight");
    expect(dialog()?.textContent).toContain("Banana");
    key("Escape");
    expect(dialog()).toBeNull();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
    expect(document.activeElement).toBe(opener);
  });

  it("keeps Tab focus trapped inside the viewer", () => {
    mount();
    click(byLabel("Open Apple"));
    const focusable = [...dialog()!.querySelectorAll<HTMLButtonElement>("button:not([disabled])")];
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    act(() => last.focus());
    key("Tab");
    expect(document.activeElement).toBe(first);
    act(() => first.focus());
    key("Tab", { shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("closes on browser/Android Back and pushes only one history entry across re-renders", () => {
    mount();
    const pushSpy = vi.spyOn(window.history, "pushState");
    speakMock.mockImplementationOnce(async () => true);
    click(byLabel("Open Apple"));
    expect(pushSpy).toHaveBeenCalledTimes(1);
    const hear = [...dialog()!.querySelectorAll("button")].find((b) =>
      b.getAttribute("aria-label")?.startsWith("Pronounce Apple")
    );
    click(hear);
    click(byLabel("Next Fruits item"));
    expect(pushSpy).toHaveBeenCalledTimes(1);
    pushSpy.mockRestore();

    act(() => {
      window.history.replaceState({}, "");
      window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
    });
    expect(dialog()).toBeNull();
  });

  it("keyboard + / - / 0 zoom and reset on desktop", () => {
    mount();
    click(byLabel("Open Apple"));
    key("+");
    expect(transform()).toContain("scale(1.5)");
    key("0");
    expect(transform()).toContain("scale(1)");
  });
});
