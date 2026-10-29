import type { GigaCreateActionId } from "@/components/gigasocial/create/gigaCreateMenu";

export type InitialMediaPickerTarget = "unified" | "image" | "video" | "audio";

export type InitialMediaPickerIntent = {
  target: InitialMediaPickerTarget;
  ctaLabel: string;
  notice: string;
};

/**
 * Android Chrome/TWA blocks file pickers opened outside a direct user gesture.
 * For launch routes that previously auto-opened a picker on mount, require one
 * explicit tap in-composer to keep gallery selection reliable.
 */
export function resolveInitialMediaPickerIntent(
  action?: GigaCreateActionId
): InitialMediaPickerIntent | null {
  switch (action) {
    case "video-studio":
    case "media-video":
      return {
        target: "video",
        ctaLabel: "Open video gallery",
        notice: "Tap “Open video gallery” to pick a video on Android Chrome/TWA.",
      };
    case "photo-studio":
    case "media-photo":
      return {
        target: "image",
        ctaLabel: "Open photo gallery",
        notice: "Tap “Open photo gallery” to pick photos on Android Chrome/TWA.",
      };
    case "media-unified":
      return {
        target: "unified",
        ctaLabel: "Open media picker",
        notice: "Tap “Open media picker” to choose files on Android Chrome/TWA.",
      };
    case "media-audio":
      return {
        target: "audio",
        ctaLabel: "Open music picker",
        notice: "Tap “Open music picker” to attach audio on Android Chrome/TWA.",
      };
    default:
      return null;
  }
}
