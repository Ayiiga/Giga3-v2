import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getLiveMediaErrorMessage,
  LIVE_SCREEN_SHARE_MOBILE_HINT,
  supportsLiveScreenShare,
} from "../../web/lib/gigasocial/liveStreaming";
import {
  isLikelyMobileLiveDevice,
  stashLiveScreenShareStream,
  stopLiveScreenShareHandoff,
  supportsOsDisplayCapture,
  takeLiveScreenShareHandoff,
} from "../../web/lib/gigasocial/liveScreenShare";

describe("live screen share capability", () => {
  afterEach(() => {
    stopLiveScreenShareHandoff();
    vi.unstubAllGlobals();
  });

  it("treats phone getUserMedia as enough for screen-share fallbacks", () => {
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: () => undefined } });
    expect(supportsOsDisplayCapture()).toBe(false);
    expect(supportsLiveScreenShare()).toBe(true);
  });

  it("reports OS capture when getDisplayMedia exists on HTTPS", () => {
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", {
      mediaDevices: { getDisplayMedia: () => undefined, getUserMedia: () => undefined },
    });
    expect(supportsOsDisplayCapture()).toBe(true);
    expect(supportsLiveScreenShare()).toBe(true);
  });

  it("maps missing getDisplayMedia errors to a phone-friendly hint", () => {
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 Mobile",
      maxTouchPoints: 5,
      mediaDevices: {},
    });
    expect(isLikelyMobileLiveDevice()).toBe(true);
    const message = getLiveMediaErrorMessage(
      new TypeError("navigator.mediaDevices.getDisplayMedia is not a function"),
      "screen"
    );
    expect(message).toBe(LIVE_SCREEN_SHARE_MOBILE_HINT);
    expect(message).not.toMatch(/is not a function/i);
  });

  it("maps permission denial for screen share clearly", () => {
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", {
      mediaDevices: { getDisplayMedia: () => undefined },
    });
    const err = new DOMException("Permission denied", "NotAllowedError");
    expect(getLiveMediaErrorMessage(err, "screen")).toMatch(/cancelled or blocked/i);
  });

  it("hands off a stashed display stream once", () => {
    const track = { stop: vi.fn(), kind: "video" } as unknown as MediaStreamTrack;
    const stream = {
      getTracks: () => [track],
      getAudioTracks: () => [],
      getVideoTracks: () => [track],
    } as unknown as MediaStream;
    stashLiveScreenShareStream(stream, "display");
    expect(takeLiveScreenShareHandoff()).toEqual({ stream, source: "display" });
    expect(takeLiveScreenShareHandoff()).toBeNull();
  });
});

describe("enterprise PWA allows display capture", () => {
  it("includes display-capture in Permissions-Policy", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const headers = readFileSync(resolve(__dirname, "../../web/public/_headers"), "utf8");
    expect(headers).toMatch(/display-capture=\(self\)/);
  });
});
