import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

describe("fullscreen camera / live / teleprompter UI", () => {
  it("camera studio uses immersive edge-to-edge shell with pre-snap edits", () => {
    const source = readFileSync(
      resolve(root, "web/components/gigasocial/studio/GigaSocialCameraStudio.tsx"),
      "utf8"
    );
    expect(source).toContain("gigasocial-immersive-capture");
    expect(source).toContain("absolute inset-0 h-full w-full object-cover");
    expect(source).toContain("PreSnapEditBar");
    expect(source).toContain("showPreSnap");
  });

  it("live room portals to a fullscreen stage", () => {
    const source = readFileSync(
      resolve(root, "web/components/gigasocial/live/GigaSocialLiveRoom.tsx"),
      "utf8"
    );
    expect(source).toContain("createPortal");
    expect(source).toContain("gigasocial-immersive-capture");
    expect(source).toContain("gigasocial-live-video--fullscreen");
    expect(source).toContain("PreSnapEditBar");
    expect(source).toContain("Preview looks");
    expect(source).toContain("Viewer playback is unavailable");
  });

  it("keeps the host camera uncropped and bounded within the live room", () => {
    const source = readFileSync(
      resolve(root, "web/components/gigasocial/live/GigaSocialLiveRoom.tsx"),
      "utf8"
    );
    const css = readFileSync(resolve(root, "web/styles/gigasocial-pro.css"), "utf8");
    expect(source).toContain('isHost && mode === "video"');
    expect(source).toContain('"gigasocial-live-camera-preview"');
    expect(source).not.toContain("object-cover");
    expect(css).toMatch(/\.gigasocial-live-camera-preview\s*{[^}]*height: 72%/);
  });

  it("keeps full-screen videos free of the single-item hint and templates above feed controls", () => {
    const lightbox = readFileSync(
      resolve(root, "web/components/gigasocial/GigaSocialMediaLightbox.tsx"),
      "utf8"
    );
    const templates = readFileSync(
      resolve(root, "web/components/gigasocial/template/GigaTemplateStudio.tsx"),
      "utf8"
    );
    expect(lightbox).toContain('className="h-full w-full object-contain"');
    expect(lightbox).toContain("!isVideo || mediaItems.length > 1");
    expect(templates).toContain("dialog.showModal()");
    expect(templates).toContain("onCancel=");
  });

  it("teleprompter opens ultra-clear fullscreen camera without pre-snap bar", () => {
    const source = readFileSync(
      resolve(root, "web/components/gigaedit/TeleprompterStudio.tsx"),
      "utf8"
    );
    expect(source).toContain("createPortal");
    expect(source).toContain("gigaedit-teleprompter-immersive");
    expect(source).toContain('variant="immersive"');
    expect(source).toContain("autoOpenCamera");
    expect(source).toContain('presentation="studio"');
    expect(source).toContain("ULTRA_CLEAR_CAMERA_LOOK");
    expect(source).toContain("ultraClear");
    expect(source).not.toContain("PreSnapEditBar");
  });

  it("media review preview fills the immersive shell", () => {
    const source = readFileSync(
      resolve(root, "web/components/gigasocial/studio/GigaSocialMediaReview.tsx"),
      "utf8"
    );
    expect(source).toContain("gigasocial-immersive-capture");
    expect(source).toContain("absolute inset-0 h-full w-full object-contain");
  });

  it("pre-snap bar exposes looks before capture", () => {
    const source = readFileSync(
      resolve(root, "web/components/gigasocial/studio/PreSnapEditBar.tsx"),
      "utf8"
    );
    expect(source).toContain("Edit look before you snap");
    expect(source).toContain("Pre-snap filters");
    expect(source).toContain("Pre-snap looks");
  });
});
