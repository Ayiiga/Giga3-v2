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

function textButton(re: RegExp): HTMLButtonElement {
  const button = [...document.querySelectorAll("button")].find((el) =>
    re.test(el.textContent ?? "")
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button matching ${re}`);
  }
  return button;
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
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const path = url.startsWith("http")
          ? new URL(url).pathname
          : url;
        const fs = await import("node:fs");
        const { resolve } = await import("node:path");
        const file = resolve(
          __dirname,
          "../../web/public",
          path.replace(/^\//, "")
        );
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

  it("lets a KG2 learner open mango, hear, play, and save offline", async () => {
    mount();
    await flush(80);
    expect(host!.textContent).not.toMatch(/Loading Ghana lessons/i);

    expect(host!.textContent).toMatch(/Discover/);
    expect(host!.textContent).toMatch(/Pictures & Objects/);
    expect(host!.textContent).toMatch(/My Offline Learning/);
    expect(document.getElementById("discover-country")).toBeTruthy();

    const nigeriaOption = [
      ...document.querySelectorAll("#discover-country option"),
    ].find((opt) => (opt as HTMLOptionElement).value === "nigeria") as HTMLOptionElement;
    expect(nigeriaOption).toBeTruthy();
    expect(nigeriaOption.disabled).toBe(true);

    click(textButton(/Pictures & Objects/i));
    await flush(80);
    expect(host!.textContent).toMatch(/Mango/);
    click(textButton(/Mango/));
    await flush(80);

    expect(host!.textContent).toMatch(/Hear the name/);
    click(textButton(/English/i));
    await flush(20);
    click(textButton(/🥭 Mango/i));
    await flush(40);
    expect(host!.textContent).toMatch(/Yes! That is a mango/i);

    click(textButton(/Save for offline/i));
    await flush(120);
    expect(host!.textContent).toMatch(/Saved on this device/i);

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => false,
    });

    click(textButton(/Close/i));
    await flush(20);
    click(textButton(/My Offline Learning/i));
    await flush(60);
    expect(textButton(/Mango/)).toBeTruthy();
    expect(window.navigator.onLine).toBe(false);
  });
});
