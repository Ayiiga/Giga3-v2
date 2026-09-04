import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("media video playback UI", () => {
  it("uses a dedicated card player instead of nested MessageMediaBlock layout", () => {
    const card = readFileSync(
      resolve(__dirname, "../../web/components/media/MediaGenerationCard.tsx"),
      "utf8"
    );
    expect(card).toContain("MediaVideoPlayer");
    expect(card).toContain("MediaCardActions");
    expect(card).not.toContain("MessageMediaBlock");
  });

  it("ships a custom tap-to-play player for generated videos", () => {
    const player = readFileSync(
      resolve(__dirname, "../../web/components/media/MediaVideoPlayer.tsx"),
      "utf8"
    );
    expect(player).toContain("Play video");
    expect(player).toContain("Fullscreen");
    expect(player).toContain('type="range"');
  });
});
