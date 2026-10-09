/**
 * @vitest-environment happy-dom
 */
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

import "fake-indexeddb/auto";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../web/lib/gigalearn/speechSynthesis", () => ({
  speakWithGigaLearnVoice: vi.fn(async () => undefined),
}));

import { DiscoverHub } from "../../web/components/gigalearn/discover/DiscoverHub";
import { DISCOVER_CATEGORIES } from "../../web/lib/gigalearn/mediaLibrary/types";

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function mount(props: { preferredLevel?: string; preferredCountryId?: string } = {}) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root?.render(
      createElement(DiscoverHub, {
        preferredLevel: props.preferredLevel ?? "KG2",
        preferredCountryId: props.preferredCountryId ?? "ghana",
      })
    );
  });
  return host;
}

function click(element: Element | null | undefined) {
  if (!element) throw new Error("Missing element to click");
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

async function flush(ms = 20) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

describe("DiscoverHub learner vertical slice", () => {
  beforeEach(async () => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase("giga3-gigalearn-offline");
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
    localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const path = url.startsWith("http") ? new URL(url).pathname : url;
        const fs = await import("node:fs");
        const { resolve } = await import("node:path");
        const file = resolve(__dirname, "../../web/public", path.replace(/^\//, ""));
        if (!fs.existsSync(file)) {
          return new Response("missing", { status: 404 });
        }
        const buf = fs.readFileSync(file);
        const mime = file.endsWith(".svg")
          ? "image/svg+xml"
          : file.endsWith(".mp3")
            ? "audio/mpeg"
            : file.endsWith(".mp4")
              ? "video/mp4"
              : "application/octet-stream";
        return new Response(buf, { status: 200, headers: { "Content-Type": mime } });
      })
    );
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    host?.remove();
    host = null;
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("marks category selected, shows results, and opens/closes a media item", async () => {
    mount();
    await flush(80);
    expect(host!.textContent).not.toMatch(/Loading Ghana lessons/i);

    const pictures = host!.querySelector(
      '[data-testid="discover-category-pictures-objects"]'
    ) as HTMLButtonElement;
    expect(pictures).toBeTruthy();
    expect(pictures.getAttribute("aria-pressed")).toBe("false");

    click(pictures);
    await flush(40);

    expect(pictures.getAttribute("aria-pressed")).toBe("true");
    expect(pictures.className).toMatch(/ring-2/);
    expect(host!.querySelector('[data-testid="discover-results-heading"]')?.textContent).toMatch(
      /Pictures & Objects/
    );
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();

    const mango = host!.querySelector(
      '[data-testid="discover-item-pic-mango-kg2"]'
    ) as HTMLButtonElement;
    expect(mango).toBeTruthy();
    click(mango);
    await flush(40);
    expect(host!.textContent).toMatch(/Hear the name/);
    expect(host!.textContent).toMatch(/Save for offline/);

    const close = [...host!.querySelectorAll("button")].find((el) =>
      /Close/i.test(el.textContent ?? "")
    );
    click(close);
    await flush(40);
    expect(host!.querySelector('[data-testid="discover-results-list"]')).toBeTruthy();
  });

  it("gives a clear empty state for My Offline Learning with a save hint", async () => {
    mount();
    await flush(80);

    click(host!.querySelector('[data-testid="discover-category-offline"]'));
    await flush(40);

    expect(host!.textContent).toMatch(/My Offline Learning/);
    expect(host!.querySelector('[data-testid="discover-empty-state"]')?.textContent).toMatch(
      /Save for offline/i
    );
  });

  it("keeps Nigeria disabled and exercises every Discover category control", async () => {
    mount();
    await flush(80);

    const nigeriaOption = [
      ...document.querySelectorAll("#discover-country option"),
    ].find((opt) => (opt as HTMLOptionElement).value === "nigeria") as HTMLOptionElement;
    expect(nigeriaOption.disabled).toBe(true);

    for (const entry of DISCOVER_CATEGORIES) {
      const button = host!.querySelector(
        `[data-testid="discover-category-${entry.id}"]`
      ) as HTMLButtonElement;
      click(button);
      await flush(20);
      expect(button.getAttribute("aria-pressed")).toBe("true");
      expect(host!.querySelector('[data-testid="discover-results-heading"]')?.textContent).toContain(
        entry.label
      );
    }
  });
});
