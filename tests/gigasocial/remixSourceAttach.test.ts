import { describe, expect, it } from "vitest";
import {
  remixModeNeedsSourceAudio,
  remixModeNeedsSourceVideo,
} from "../../web/lib/gigasocial/remixSourceAttach";

describe("remix source attach policy", () => {
  it("keeps source video for composition modes", () => {
    expect(remixModeNeedsSourceVideo("split-view")).toBe(true);
    expect(remixModeNeedsSourceVideo("voice-over")).toBe(true);
    expect(remixModeNeedsSourceVideo("green-screen")).toBe(true);
    expect(remixModeNeedsSourceVideo("ai-subtitles")).toBe(true);
    expect(remixModeNeedsSourceVideo("classic")).toBe(true);
  });

  it("requests source audio for sound-reuse and voice-over", () => {
    expect(remixModeNeedsSourceAudio("sound-reuse")).toBe(true);
    expect(remixModeNeedsSourceAudio("voice-over")).toBe(true);
    expect(remixModeNeedsSourceAudio("classic")).toBe(false);
  });
});
