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
    expect(source).toContain("Pre-live looks");
  });

  it("teleprompter opens a fullscreen camera with pre-snap looks", () => {
    const source = readFileSync(
      resolve(root, "web/components/gigaedit/TeleprompterStudio.tsx"),
      "utf8"
    );
    expect(source).toContain("createPortal");
    expect(source).toContain("gigaedit-teleprompter-immersive");
    expect(source).toContain('variant="immersive"');
    expect(source).toContain("autoOpenCamera");
    expect(source).toContain('presentation="studio"');
    expect(source).toContain("PreSnapEditBar");
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
