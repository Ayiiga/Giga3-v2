/**
 * @vitest-environment happy-dom
 */
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ProductSeoHeader } from "../../web/components/seo/ProductSeoHeader";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function mount(props: {
  title: string;
  description: string;
  detail?: string;
  compact?: boolean;
  collapsible?: boolean;
}) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root?.render(createElement(ProductSeoHeader, { showProductNav: false, ...props }));
  });
  return host;
}

describe("ProductSeoHeader compact Read more", () => {
  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    host?.remove();
    host = null;
  });

  it("shows short intro and collapses longer detail behind Read more", () => {
    mount({
      compact: true,
      title: "GigaLearn — Learn Smarter",
      description:
        "Learn, practise and prepare for exams with GigaLearn, your AI-powered learning companion for Ghana.",
      detail: "Longer SEO explanation about BECE and WASSCE revision help.",
    });

    expect(host!.querySelector("h1")?.textContent).toBe("GigaLearn — Learn Smarter");
    expect(host!.textContent).toMatch(/Learn, practise and prepare/);
    expect(host!.textContent).toMatch(/Read more/);
    expect(host!.textContent).toMatch(/BECE and WASSCE/);

    const toggle = host!.querySelector('button[aria-expanded="false"]');
    expect(toggle).toBeTruthy();
    expect(toggle!.textContent).toMatch(/Read more/);

    act(() => {
      (toggle as HTMLButtonElement).click();
    });

    const expanded = host!.querySelector('button[aria-expanded="true"]');
    expect(expanded).toBeTruthy();
    expect(host!.textContent).toMatch(/Read less/);
  });

  it("keeps GigaLearn page metadata and JSON-LD on the longer description", () => {
    const page = readFileSync(
      resolve(__dirname, "../../web/app/(marketing)/gigalearn/page.tsx"),
      "utf8"
    );
    expect(page).toContain('title: "GigaLearn — AI Tutor for BECE & WASSCE in Ghana | Giga3 AI"');
    expect(page).toContain("GIGALEARN_META_DESCRIPTION");
    expect(page).toContain("GigaLearn — Learn Smarter");
    expect(page).toContain("Learn, practise and prepare for exams");
    expect(page).toMatch(/publicMetadata\(/);
    expect(page).toContain("JsonLd");
    expect(page).toContain("GIGALEARN_META_DESCRIPTION");
  });

  it("keeps GigaEdit page compact with Read more and Starter Pack detail", () => {
    const page = readFileSync(
      resolve(__dirname, "../../web/app/(marketing)/gigaedit/page.tsx"),
      "utf8"
    );
    expect(page).toContain("GigaEdit — Trim, join, and publish video");
    expect(page).toMatch(/ProductSeoHeader[\s\S]*compact/);
    expect(page).toContain("Creator Growth Starter Pack");
    expect(page).toContain("Hook Reel");
    expect(page).toMatch(/publicMetadata\(/);
    expect(page).toContain("JsonLd");
  });
});
