import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getLiveMediaErrorMessage,
  LIVE_SCREEN_SHARE_UNSUPPORTED_MESSAGE,
  supportsLiveScreenShare,
} from "../../web/lib/gigasocial/liveStreaming";

describe("live screen share capability", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports unsupported when getDisplayMedia is missing", () => {
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: () => undefined } });
    expect(supportsLiveScreenShare()).toBe(false);
  });

  it("reports supported when getDisplayMedia exists on HTTPS", () => {
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", {
      mediaDevices: { getDisplayMedia: () => undefined, getUserMedia: () => undefined },
    });
    expect(supportsLiveScreenShare()).toBe(true);
  });

  it("maps missing getDisplayMedia errors to a mobile-friendly message", () => {
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", { mediaDevices: {} });
    const message = getLiveMediaErrorMessage(
      new TypeError("navigator.mediaDevices.getDisplayMedia is not a function"),
      "screen"
    );
    expect(message).toBe(LIVE_SCREEN_SHARE_UNSUPPORTED_MESSAGE);
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
});
