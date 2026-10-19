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
  expandLabel?: string;
  collapseLabel?: string;
}) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root?.render(createElement(ProductSeoHeader, { showProductNav: false, ...props }));
  });
  return host;
}

describe("ProductSeoHeader compact Learn more", () => {
  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    host?.remove();
    host = null;
  });

  it("shows short intro and collapses longer detail behind Learn more", () => {
    mount({
      compact: true,
      expandLabel: "Learn more",
      collapseLabel: "Show less",
      title: "GigaLearn — Learn Smarter, Score Higher",
      description:
        "Explore Ghana curriculum-aligned lessons, practise exam questions, track your progress, and learn with your AI tutor.",
      detail: "Longer SEO explanation about BECE and WASSCE revision help.",
    });

    expect(host!.querySelector("h1")?.textContent).toBe(
      "GigaLearn — Learn Smarter, Score Higher"
    );
    expect(host!.textContent).toMatch(/Ghana curriculum-aligned/);
    expect(host!.textContent).toMatch(/Learn more/);
    expect(host!.textContent).toMatch(/BECE and WASSCE/);

    const toggle = host!.querySelector('button[aria-expanded="false"]');
    expect(toggle).toBeTruthy();
    expect(toggle!.textContent).toMatch(/Learn more/);

    act(() => {
      (toggle as HTMLButtonElement).click();
    });

    const expanded = host!.querySelector('button[aria-expanded="true"]');
    expect(expanded).toBeTruthy();
    expect(host!.textContent).toMatch(/Show less/);
  });

  it("keeps GigaLearn page metadata and JSON-LD on the longer description", () => {
    const page = readFileSync(
      resolve(__dirname, "../../web/app/(marketing)/gigalearn/page.tsx"),
      "utf8"
    );
    expect(page).toContain('title: "GigaLearn — AI Tutor for BECE & WASSCE in Ghana | Giga3 AI"');
    expect(page).toContain("GIGALEARN_META_DESCRIPTION");
    expect(page).toContain("GigaLearn — Learn Smarter, Score Higher");
    expect(page).toContain("Ghana curriculum-aligned lessons");
    expect(page).toContain("expandLabel=\"Learn more\"");
    expect(page).toContain('className="marketing-stable gigalearn-stable px-4 py-3 pb-6 sm:px-6 sm:py-4"');
    expect(page).not.toMatch(/className="[^"]*section-padding/);
    expect(page).toMatch(/publicMetadata\(/);
    expect(page).toContain("JsonLd");
    expect(page).toContain("PublicProductPageShell");
  });

  it("keeps Marketplace compact with catalogue CTA and SEO shell below", () => {
    const page = readFileSync(
      resolve(__dirname, "../../web/app/(marketing)/marketplace/page.tsx"),
      "utf8"
    );
    expect(page).toContain("Discover. Buy. Sell.");
    expect(page).toContain("Browse Products");
    expect(page).toContain("#marketplace-catalogue");
    expect(page).toContain("/marketplace/sell");
    expect(page).toMatch(/ProductSeoHeader[\s\S]*compact/);
    expect(page).toContain("MARKETPLACE_PAGE_SHELL");
    expect(page).toContain("Digital Products for Learning, Business, and Creativity");
    expect(page).toMatch(/publicMetadata\(/);
    expect(page).toContain("JsonLd");
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
