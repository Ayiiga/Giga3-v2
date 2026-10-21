/**
 * Keep Android TWA launcher shortcuts aligned with education-first products.
 * Regenerating via android/scripts/generate-project.mjs must not reintroduce retired Video AI.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

describe("Android TWA shortcuts (Play readiness)", () => {
  it("does not deep-link launcher shortcuts to retired Video AI /media routes", () => {
    const shortcutsXml = read("android/app/src/main/res/xml/shortcuts.xml");
    const buildGradle = read("android/app/build.gradle");
    const twa = read("android/twa-manifest.json");
    for (const src of [shortcutsXml, buildGradle, twa]) {
      expect(src).not.toMatch(/Video AI/i);
      expect(src).not.toContain("https://www.giga3ai.com/video/");
      expect(src).not.toContain("https://www.giga3ai.com/media/");
    }
  });

  it("includes Chat, Academy, Exam Practice, and Marketplace shortcuts", () => {
    const shortcutsXml = read("android/app/src/main/res/xml/shortcuts.xml");
    expect(shortcutsXml).toContain("https://www.giga3ai.com/chat/");
    expect(shortcutsXml).toContain("https://www.giga3ai.com/gigalearn/academy/");
    expect(shortcutsXml).toContain("https://www.giga3ai.com/gigalearn/exam/");
    expect(shortcutsXml).toContain("https://www.giga3ai.com/marketplace/");
  });

  it("keeps targetSdk 36 and package com.giga3ai.app", () => {
    const buildGradle = read("android/app/build.gradle");
    expect(buildGradle).toMatch(/applicationId\s+"com\.giga3ai\.app"/);
    expect(buildGradle).toMatch(/targetSdkVersion\s+36/);
    expect(buildGradle).toMatch(/compileSdkVersion\s+36/);
  });

  it("resolves release signing keystore from android/ rootProject", () => {
    const signing = read("android/app/release-signing.gradle");
    expect(signing).toContain("rootProject.file");
    expect(signing).toContain("resolveStoreFile");
    expect(signing).toContain(".trim()");
  });

  it("keeps androidx.browser trusted meta-data names (no Bubblewrap androix typo)", () => {
    const manifest = read("android/app/src/main/AndroidManifest.xml");
    expect(manifest).not.toContain("androix.browser");
    expect(manifest).toContain("androidx.browser.trusted.NAVIGATION_BAR_DIVIDER_COLOR");
  });
});
