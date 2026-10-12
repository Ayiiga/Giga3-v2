/**
 * @vitest-environment happy-dom
 */
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { LearningImageCard } from "../../web/components/gigalearn/media/LearningImageCard";

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function mount(props: Parameters<typeof LearningImageCard>[0]) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root?.render(createElement(LearningImageCard, props));
  });
  return host;
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  host?.remove();
  host = null;
});

describe("LearningImageCard", () => {
  it("shows a loading state then ready when the image loads", async () => {
    const el = mount({
      src: "/gigalearn/media/ghana/kg2/hq/mango.webp",
      alt: "A ripe mango",
      fallbackEmoji: "🥭",
    });
    expect(el.querySelector('[data-testid="learning-image-loading"]')).toBeTruthy();
    const img = el.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("alt")).toBe("A ripe mango");
    expect(img.getAttribute("loading")).toBe("lazy");
    await act(async () => {
      img.dispatchEvent(new Event("load"));
    });
    expect(el.querySelector('[data-testid="learning-image-card"]')?.getAttribute("data-phase")).toBe(
      "ready"
    );
  });

  it("falls back to emoji with accessible alt when src is missing", () => {
    const el = mount({
      src: null,
      alt: "Mango fruit",
      fallbackEmoji: "🥭",
    });
    const fallback = el.querySelector('[data-testid="learning-image-fallback"]');
    expect(fallback).toBeTruthy();
    expect(fallback?.getAttribute("aria-label")).toBe("Mango fruit");
    expect(fallback?.textContent).toContain("🥭");
  });

  it("falls back when the image errors", async () => {
    const el = mount({
      src: "/missing.webp",
      alt: "Missing art",
      fallbackEmoji: "🖼️",
    });
    const img = el.querySelector("img") as HTMLImageElement;
    await act(async () => {
      img.dispatchEvent(new Event("error"));
    });
    expect(el.querySelector('[data-testid="learning-image-fallback"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="learning-image-card"]')?.getAttribute("data-phase")).toBe(
      "error"
    );
  });
});
