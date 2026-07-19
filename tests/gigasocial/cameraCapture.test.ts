import { describe, expect, it } from "vitest";
import {
  getCameraErrorMessage,
  isPermissionDenied,
  normalizeRecordedVideoMime,
  videoFileExtension,
} from "../../web/lib/gigasocial/cameraCapture";

describe("cameraCapture helpers", () => {
  it("detects permission denied DOMExceptions", () => {
    expect(isPermissionDenied(new DOMException("denied", "NotAllowedError"))).toBe(true);
    expect(isPermissionDenied(new DOMException("missing", "NotFoundError"))).toBe(false);
  });

  it("maps permission errors to actionable copy", () => {
    expect(getCameraErrorMessage(new DOMException("denied", "NotAllowedError"))).toMatch(
      /Allow camera and microphone/i
    );
    expect(getCameraErrorMessage(new DOMException("busy", "NotReadableError"))).toMatch(
      /in use by another app/i
    );
  });

  it("normalizes recorder mime types for upload validation", () => {
    expect(normalizeRecordedVideoMime("video/webm;codecs=vp9,opus")).toBe("video/webm");
    expect(normalizeRecordedVideoMime("video/mp4")).toBe("video/mp4");
    expect(videoFileExtension("video/mp4")).toBe("mp4");
    expect(videoFileExtension("video/webm;codecs=vp8")).toBe("webm");
  });
});
