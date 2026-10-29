import { describe, expect, it } from "vitest";
import { resolveInitialMediaPickerIntent } from "../../web/lib/gigasocial/initialMediaPicker";

describe("resolveInitialMediaPickerIntent", () => {
  it("requires an explicit picker tap for video launch actions", () => {
    expect(resolveInitialMediaPickerIntent("media-video")).toMatchObject({
      target: "video",
      ctaLabel: "Open video gallery",
    });
    expect(resolveInitialMediaPickerIntent("video-studio")).toMatchObject({
      target: "video",
      ctaLabel: "Open video gallery",
    });
  });

  it("requires an explicit picker tap for photo launch actions", () => {
    expect(resolveInitialMediaPickerIntent("media-photo")).toMatchObject({
      target: "image",
      ctaLabel: "Open photo gallery",
    });
    expect(resolveInitialMediaPickerIntent("photo-studio")).toMatchObject({
      target: "image",
      ctaLabel: "Open photo gallery",
    });
  });

  it("supports unified and audio launcher intents", () => {
    expect(resolveInitialMediaPickerIntent("media-unified")).toMatchObject({
      target: "unified",
      ctaLabel: "Open media picker",
    });
    expect(resolveInitialMediaPickerIntent("media-audio")).toMatchObject({
      target: "audio",
      ctaLabel: "Open music picker",
    });
  });

  it("returns null for actions that should not launch a gallery picker", () => {
    expect(resolveInitialMediaPickerIntent("media-camera")).toBeNull();
    expect(resolveInitialMediaPickerIntent("story-content")).toBeNull();
    expect(resolveInitialMediaPickerIntent("text-post")).toBeNull();
  });
});
