import { describe, expect, it } from "vitest";
import {
  DEFAULT_CAMERA_LOOK,
  analyzeImageData,
  buildProCameraConstraints,
  composeCameraLookCss,
  emptyFrameAnalysis,
} from "../../web/lib/gigaedit/cameraLook";
import {
  detectDeviceTier,
  getExportMaxEdge,
  getPreviewMaxEdge,
} from "../../web/lib/gigaedit/deviceCapability";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("GigaEdit camera look pipeline", () => {
  it("analyzes luminance from ImageData-like buffers", () => {
    const pixels = new Uint8ClampedArray(4 * 4 * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 200;
      pixels[i + 1] = 180;
      pixels[i + 2] = 40;
      pixels[i + 3] = 255;
    }
    const data = { data: pixels, width: 4, height: 4, colorSpace: "srgb" } as ImageData;
    const analysis = analyzeImageData(data, 1);
    expect(analysis.luminance).toBeGreaterThan(0.3);
    expect(analysis.warmth).toBeGreaterThan(0);
  });

  it("composes non-destructive camera CSS with natural color bias", () => {
    const css = composeCameraLookCss({
      look: DEFAULT_CAMERA_LOOK,
      analysis: { luminance: 0.2, warmth: -0.3, sampledAt: 1 },
      baseFilterId: "none",
      tier: "mid",
    });
    expect(css).toContain("brightness(");
    expect(css).toContain("saturate(");
    expect(emptyFrameAnalysis().luminance).toBe(0.5);
  });

  it("builds pro camera constraints with continuous modes", () => {
    const constraints = buildProCameraConstraints({
      facingMode: "user",
      look: DEFAULT_CAMERA_LOOK,
      tier: "mid",
    });
    expect(constraints.audio).toBe(true);
    expect(constraints.video).toBeTruthy();
    const video = constraints.video as MediaTrackConstraints & {
      advanced?: Array<Record<string, unknown>>;
    };
    expect(video.advanced?.some((a) => a.focusMode === "continuous")).toBe(true);
  });
});

describe("GigaEdit device capability", () => {
  it("returns finite preview/export edges", () => {
    const tier = detectDeviceTier();
    expect(["low", "mid", "high"]).toContain(tier);
    expect(getPreviewMaxEdge(tier)).toBeGreaterThan(480);
    expect(getExportMaxEdge(tier)).toBeGreaterThanOrEqual(getPreviewMaxEdge(tier));
  });
});

describe("Workspace shortcut order", () => {
  it("lists GigaSocial → GigaEdit → GigaLearn first in chat surfaces", () => {
    const apps = readFileSync(
      resolve(__dirname, "../../web/lib/chat/workspaceApps.ts"),
      "utf8"
    );
    const sidebar = readFileSync(
      resolve(__dirname, "../../web/components/chat/ChatSidebar.tsx"),
      "utf8"
    );
    const more = readFileSync(
      resolve(__dirname, "../../web/components/chat/ChatMoreMenu.tsx"),
      "utf8"
    );
    const workspace = readFileSync(
      resolve(__dirname, "../../web/components/chat/ChatWorkspacePanel.tsx"),
      "utf8"
    );

    const orderOf = (src: string, labels: string[]) =>
      labels.map((label) => src.indexOf(label)).filter((i) => i >= 0);

    const sidebarOrder = orderOf(apps, [
      'label: "GigaSocial"',
      'label: "GigaEdits"',
      'label: "GigaLearn"',
      'label: "Media Studio"',
    ]);
    expect(sidebarOrder).toHaveLength(4);
    expect(sidebarOrder[0]).toBeLessThan(sidebarOrder[1]);
    expect(sidebarOrder[1]).toBeLessThan(sidebarOrder[2]);
    expect(sidebarOrder[2]).toBeLessThan(sidebarOrder[3]);
    expect(sidebar).toContain("CHAT_WORKSPACE_PRIMARY_APPS");

    const moreOrder = orderOf(more, [
      'label: "GigaSocial"',
      'label: "GigaEdits"',
      'label: "GigaLearn"',
      'label: "Media Studio"',
    ]);
    expect(moreOrder[0]).toBeLessThan(moreOrder[1]);
    expect(moreOrder[1]).toBeLessThan(moreOrder[2]);
    expect(moreOrder[2]).toBeLessThan(moreOrder[3]);

    expect(workspace).toContain("CHAT_WORKSPACE_PRIMARY_APPS");
    expect(apps.indexOf("GigaSocial")).toBeLessThan(apps.indexOf("GigaEdits"));
    expect(apps.indexOf("GigaEdits")).toBeLessThan(apps.indexOf("GigaLearn"));
    expect(apps.indexOf("GigaLearn")).toBeLessThan(apps.indexOf("Media Studio"));
  });
});
