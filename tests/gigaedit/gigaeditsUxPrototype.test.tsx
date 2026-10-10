/**
 * @vitest-environment happy-dom
 */
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { GigaEditsUxPrototype } from "../../web/prototypes/gigaedits-ux/GigaEditsUxPrototype";

const ROOT = resolve(__dirname, "../..");
const PROTO_DIR = resolve(ROOT, "web/prototypes/gigaedits-ux");

function readProto(name: string) {
  return readFileSync(join(PROTO_DIR, name), "utf8");
}

function walkFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

describe("GigaEdits UX prototype isolation", () => {
  it("lives outside web/app and is never imported from app routes", () => {
    expect(existsSync(join(PROTO_DIR, "index.html"))).toBe(true);
    expect(existsSync(join(PROTO_DIR, "proto.css"))).toBe(true);
    expect(existsSync(join(PROTO_DIR, "proto.js"))).toBe(true);

    const appFiles = walkFiles(resolve(ROOT, "web/app"));
    for (const file of appFiles) {
      if (!/\.(tsx?|jsx?|mjs|js|css|md)$/.test(file)) continue;
      const src = readFileSync(file, "utf8");
      expect(src).not.toMatch(/prototypes\/gigaedits-ux/);
      expect(src).not.toMatch(/GigaEditsUxPrototype/);
    }
  });

  it("static HTML exposes Create Home and Quick Edit with local-device messaging", () => {
    const html = readProto("index.html");
    expect(html).toContain('data-production-route="false"');
    expect(html).toContain("Create a video");
    expect(html).toContain("Quick Edit");
    expect(html).toContain("Film Studio");
    expect(html).toContain("Creator Studio");
    expect(html).toContain("Photo");
    expect(html).toContain("Record");
    expect(html).toContain("Teleprompter");
    expect(html).toMatch(/Local device only/i);
    expect(html).toMatch(/not\s+synced to your account/i);
    expect(html).toContain('id="screen-quick-edit"');
    expect(html).toContain("Export");
    expect(html).toContain("Undo");
    expect(html).toContain("Captions");
  });

  it("CSS uses deep navy foundation and violet primary with ≥44px tap tokens", () => {
    const css = readProto("proto.css");
    expect(css).toContain("--ge-bg: #0b1220");
    expect(css).toContain("--ge-violet: #8b5cf6");
    expect(css).toContain("--ge-text: #ffffff");
    expect(css).toContain("--ge-tap: 44px");
    expect(css).toContain("prefers-reduced-motion");
  });

  it("prototype JS refuses to fake a real export file", () => {
    const js = readProto("proto.js");
    expect(js).toMatch(/does not encode or download a file/i);
    expect(js).not.toMatch(/MediaRecorder|createObjectURL|download=/);
  });
});

describe("GigaEditsUxPrototype React mirror", () => {
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    host?.remove();
    host = null;
  });

  function mount(initialScreen?: "home" | "quick-edit") {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => {
      root?.render(createElement(GigaEditsUxPrototype, { initialScreen }));
    });
  }

  it("starts on Create Home with primary Create a video action", () => {
    mount("home");
    expect(host?.querySelector('[aria-label="Create Home"]')).toBeTruthy();
    expect(host?.textContent).toContain("Create a video");
    expect(host?.textContent).toContain("Quick Edit");
    expect(host?.textContent).toMatch(/Local device only/i);
  });

  it("navigates to Quick Edit and keeps Export honest", () => {
    mount("home");
    const create = Array.from(host?.querySelectorAll("button") ?? []).find(
      (b) => b.textContent?.trim() === "Create a video"
    );
    expect(create).toBeTruthy();
    act(() => {
      create?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(host?.querySelector('[aria-label="Quick Edit"]')).toBeTruthy();
    expect(host?.textContent).toContain("Import");
    expect(host?.textContent).toContain("Trim");
    expect(host?.textContent).toContain("Captions");

    const importBtn = Array.from(host?.querySelectorAll("button") ?? []).find(
      (b) => b.textContent?.trim() === "Import"
    );
    act(() => {
      importBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const exportBtn = Array.from(host?.querySelectorAll("button") ?? []).find(
      (b) => b.textContent?.trim() === "Export"
    );
    expect(exportBtn?.hasAttribute("disabled")).toBe(false);
    act(() => {
      exportBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(host?.textContent).toMatch(/does not encode or download a file/i);
  });

  it("supports undo after mock import", () => {
    mount("quick-edit");
    const importBtn = Array.from(host?.querySelectorAll("button") ?? []).find(
      (b) => b.textContent?.trim() === "Import"
    );
    act(() => {
      importBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(host?.textContent).toContain("Mock clip ready");
    const undo = Array.from(host?.querySelectorAll("button") ?? []).find(
      (b) => b.textContent?.trim() === "Undo"
    );
    act(() => {
      undo?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(host?.textContent).toContain("No clip yet");
  });
});

describe("production static export must not ship the prototype", () => {
  it("web/out (if present) has no gigaedits-ux prototype pages", () => {
    const outDir = resolve(ROOT, "web/out");
    if (!existsSync(outDir)) {
      // Build not run in this process — isolation still enforced via app import scan above.
      expect(true).toBe(true);
      return;
    }
    const outFiles = walkFiles(outDir);
    const leaked = outFiles.filter((f) => /gigaedits-ux|GigaEditsUxPrototype/i.test(f));
    expect(leaked).toEqual([]);
    for (const file of outFiles) {
      if (!/\.(html|js|css|txt|json)$/.test(file)) continue;
      const src = readFileSync(file, "utf8");
      expect(src).not.toMatch(/data-prototype="gigaedits-ux"/);
    }
  });
});
