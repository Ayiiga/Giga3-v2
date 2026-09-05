import { describe, expect, it } from "vitest";
import { buildAiAssistPrompt, generateLocalCreativeDraft } from "../../web/lib/gigaedit/aiAssist";
import { aspectRatioCss, aspectRatioSize } from "../../web/lib/gigaedit/exportFormats";
import {
  GIGAEDIT_FEATURE_DEFAULTS,
  getGigaEditFeatures,
} from "../../web/lib/gigaedit/featureFlags";
import { GIGAEDIT_OFFLINE_CAPABILITIES } from "../../web/lib/gigaedit/offline";
import { createEmptyProject, exportProjectJson } from "../../web/lib/gigaedit/projects";
import { GIGAEDIT_TEMPLATES } from "../../web/lib/gigaedit/templates";
import { EXPORT_FORMATS, GIGAEDIT_QUICK_ACTIONS } from "../../web/lib/gigaedit/types";
import { siteConfig } from "../../web/lib/site";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("GigaEdit feature flag", () => {
  it("enables GigaEdit by default", () => {
    expect(GIGAEDIT_FEATURE_DEFAULTS.enableGigaEdit).toBe(true);
    expect(getGigaEditFeatures({}).enableGigaEdit).toBe(true);
  });
});

describe("GigaEdit dashboard catalog", () => {
  it("exposes the required quick actions", () => {
    const labels = GIGAEDIT_QUICK_ACTIONS.map((a) => a.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        "New Video",
        "Edit Photo",
        "Teleprompter",
        "AI Script",
        "Templates",
        "Audio Studio",
        "Social Media Creator",
        "My Projects",
      ])
    );
  });

  it("includes social export formats", () => {
    const ratios = EXPORT_FORMATS.map((f) => f.aspectRatio);
    expect(ratios).toEqual(expect.arrayContaining(["9:16", "16:9", "1:1", "4:5"]));
  });
});

describe("GigaEdit helpers", () => {
  it("builds AI prompts and local drafts with AI labels", () => {
    const prompt = buildAiAssistPrompt("hook", "solar power");
    expect(prompt.toLowerCase()).toContain("hook");
    const draft = generateLocalCreativeDraft("caption", "solar power");
    expect(draft).toContain("AI-assisted");
  });

  it("maps aspect ratios", () => {
    expect(aspectRatioCss("9:16")).toBe("9 / 16");
    expect(aspectRatioSize("16:9")).toEqual({ width: 1920, height: 1080 });
  });

  it("creates exportable local projects", () => {
    const project = createEmptyProject({ kind: "video", title: "Demo" });
    expect(project.offlineReady).toBe(true);
    expect(project.hasOriginal).toBe(false);
    const json = exportProjectJson(project);
    expect(json).toContain("GigaEdit local project export");
  });

  it("ships offline-ready templates", () => {
    expect(GIGAEDIT_TEMPLATES.every((t) => t.offline)).toBe(true);
    expect(GIGAEDIT_OFFLINE_CAPABILITIES.length).toBeGreaterThanOrEqual(8);
  });
});

describe("GigaEdit routing & SW", () => {
  it("registers site link", () => {
    expect(siteConfig.links.gigaedit).toBe("/gigaedit");
  });

  it("precaches gigaedit shell and bumps cache version", () => {
    const sw = readFileSync(resolve(__dirname, "../../web/public/sw.js"), "utf8");
    expect(sw).toContain('CACHE_NAME = "giga3-shell-v237-gigasocial-share-og"');
    expect(sw).toContain('"/gigaedit/"');
  });

  it("imports formatTimecodeMs in VideoEditor (prevents runtime ReferenceError)", () => {
    const src = readFileSync(
      resolve(__dirname, "../../web/components/gigaedit/VideoEditor.tsx"),
      "utf8"
    );
    expect(src).toMatch(/import\s*\{[^}]*formatTimecodeMs[^}]*\}\s*from\s*"@\/lib\/gigaedit\/frameTime"/);
  });
});
