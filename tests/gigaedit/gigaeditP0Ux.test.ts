import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { VOICEOVER_EXPORT_CREDITS } from "../../web/lib/gigaedit/voiceover/mux";
import { GIGAEDITS_PAGE } from "../../web/lib/seo/productPageContent";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("GigaEdits P0 UX reliability", () => {
  it("video editor uses confirmed playhead trim (not 35% heuristic)", () => {
    const src = read("web/components/gigaedit/VideoEditor.tsx");
    expect(src).toContain("confirmPlayheadTrim");
    expect(src).toContain("openTrimPrompt");
    expect(src).toContain("Keep after playhead");
    expect(src).toContain("Keep before playhead");
    expect(src).not.toContain("sourceDuration * 0.35");
    expect(src).toContain("project.captions = captions");
    expect(src).toContain("readProjectCaptions");
    expect(src).toContain("Join on export");
    expect(src).toContain("Export does not apply background-noise reduction yet");
    expect(src).toContain("onProjectIdChange");
    const client = read("web/components/gigaedit/GigaEditClient.tsx");
    expect(client).toContain("onProjectIdChange");
    expect(client).toContain('params.set("project", id)');
  });

  it("voiceover mix messaging is on-device free (no credit charge UI)", () => {
    expect(VOICEOVER_EXPORT_CREDITS).toBe(0);
    const panel = read("web/components/gigaedit/VoiceoverPanel.tsx");
    expect(panel).toContain("free, no credits");
    expect(panel).not.toContain("This export uses");
    expect(panel).not.toContain("VOICEOVER_EXPORT_CREDITS");
  });

  it("home defaults to Create tools and clarifies local-only drafts", () => {
    const home = read("web/components/gigaedit/GigaEditHome.tsx");
    expect(home).toContain('useState<CreatorToolkitFilter>("create")');
    expect(home).toContain("drafts save on this device only");
    expect(home).toContain("AI Studio uses credits");
  });

  it("marketing copy does not claim account cloud project backup", () => {
    expect(GIGAEDITS_PAGE.giga3Connection).toMatch(/on your device/i);
    expect(GIGAEDITS_PAGE.giga3Connection).not.toMatch(/save projects to your account/i);
  });

  it("exposes violet accent tokens without removing deep navy", () => {
    const css = read("web/styles/gigaedit.css");
    expect(css).toContain("--ge-bg: #0b1220");
    expect(css).toContain("--ge-violet:");
    expect(css).toContain("--ge-violet-soft:");
  });
});
