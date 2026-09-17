import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CREATOR_HOME_ACTIONS } from "../../web/lib/gigaedit/creatorStudio/homeActions";
import {
  GIGAEDIT_TOOL_CATALOG,
  resolveGigaEditToolHref,
} from "../../web/lib/gigaedit/toolCatalog";
import { GIGAEDIT_SECTION_LABELS } from "../../web/components/gigaedit/EditorShell";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("GigaEdit controls audit — navigation surfaces", () => {
  it("resolves every catalog tool to a real destination", () => {
    for (const tool of GIGAEDIT_TOOL_CATALOG) {
      const href = resolveGigaEditToolHref(tool);
      expect(href, `tool ${tool.id} should resolve`).toBeTruthy();
      if (tool.kind === "media") {
        expect(href).toMatch(/^\/media\?/);
      } else if (tool.section) {
        expect(href).toMatch(/^\/gigaedit/);
      }
    }
  });

  it("maps every GigaEdit section used in home actions", () => {
    const sections = CREATOR_HOME_ACTIONS.map((a) => a.section).filter(Boolean);
    for (const section of sections) {
      expect(GIGAEDIT_SECTION_LABELS[section!]).toBeTruthy();
    }
    const mediaAction = CREATOR_HOME_ACTIONS.find((a) => a.kind === "media");
    expect(mediaAction?.id).toBe("generate-ai");
  });

  it("bottom nav wires onOpenSection for each tab", () => {
    const nav = read("web/components/gigaedit/GigaEditBottomNav.tsx");
    expect(nav).toContain('onClick={() => onOpenSection?.(item.id)}');
    expect(nav).toContain('aria-label="GigaEdit navigation"');
    expect(nav).toMatch(/min-h-11/);
  });

  it("does not render a dead search control in the video editor header", () => {
    const header = read("web/components/gigaedit/VideoEditorHeader.tsx");
    expect(header).not.toContain('aria-label="Search"');
    expect(header).not.toMatch(/from "lucide-react"[^;]*Search/);
    expect(header).toContain("onExport");
    expect(header).toContain("onUndo");
  });
});

describe("GigaEdit controls audit — provider and billing safety", () => {
  it("keeps video generation on fal primary with replicate fallback in media engine", () => {
    const engine = read("convex/mediaEngine.ts");
    expect(engine).toContain("const falResult = await tryFal");
    expect(engine).toContain("const replicateResult = await tryReplicate");
    expect(engine.indexOf("const falResult")).toBeLessThan(
      engine.indexOf('const replicateResult = await tryReplicate(\n    errors.length')
    );
  });

  it("does not expose API keys in gigaedit client components", () => {
    const components = read("web/components/gigaedit/GigaEditClient.tsx");
    expect(components).not.toMatch(/api[_-]?key/i);
    expect(components).not.toMatch(/sk_live|sk_test/);
  });

  it("refunds media job credits on worker failure (no double charge on retry)", () => {
    const worker = read("convex/mediaVideoWorker.ts");
    expect(worker).toContain("refundMediaJobCredits");
    const media = read("convex/media.ts");
    expect(media).toContain("chargeCreditsForMedia");
    expect(media).toContain("creditsCharged: cost");
  });
});

describe("GigaEdit controls audit — mobile layout guards", () => {
  it("offsets bottom nav for global primary nav on phones", () => {
    const css = read("web/styles/primary-nav.css");
    expect(css).toContain(".gigaedit-bottom-nav");
    expect(css).toContain("margin-bottom: var(--primary-nav-offset)");
  });

  it("allows horizontal scroll for video tool tabs on narrow screens", () => {
    const css = read("web/styles/gigaedit.css");
    expect(css).toContain(".gigaedit-editor-tooltabs");
    expect(css).toContain("overflow-x: auto");
    expect(css).toContain("touch-action: pan-x");
  });

  it("uses immersive full-screen shell for video editor", () => {
    const client = read("web/components/gigaedit/GigaEditClient.tsx");
    expect(client).toContain('section === "video"');
    expect(client).toContain("immersive={section === \"video\"}");
    const css = read("web/styles/gigaedit.css");
    expect(css).toContain("html.gigaedit-video-mode .gigaedit-shell--editor");
    expect(css).toContain("position: fixed");
  });
});
