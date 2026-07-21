/** Data Saver modes for African networks / low-end devices. */

export type DataSaverMode = "off" | "saver" | "ultra";

export type VideoQualityId =
  | "auto"
  | "1080p"
  | "720p"
  | "480p"
  | "360p"
  | "240p"
  | "audio";

const MODE_KEY = "giga3_gigasocial_data_saver";
const QUALITY_KEY = "giga3_gigasocial_video_quality";

export const VIDEO_QUALITY_OPTIONS: { id: VideoQualityId; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "1080p", label: "1080p" },
  { id: "720p", label: "720p" },
  { id: "480p", label: "480p" },
  { id: "360p", label: "360p" },
  { id: "240p", label: "240p" },
  { id: "audio", label: "Audio Only" },
];

export function readDataSaverMode(): DataSaverMode {
  if (typeof window === "undefined") return "off";
  try {
    const raw = localStorage.getItem(MODE_KEY);
    if (raw === "saver" || raw === "ultra" || raw === "off") return raw;
  } catch {
    /* ignore */
  }
  return "off";
}

export function writeDataSaverMode(mode: DataSaverMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function readVideoQualityPreference(): VideoQualityId {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = localStorage.getItem(QUALITY_KEY) as VideoQualityId | null;
    if (raw && VIDEO_QUALITY_OPTIONS.some((o) => o.id === raw)) return raw;
  } catch {
    /* ignore */
  }
  return "auto";
}

export function writeVideoQualityPreference(quality: VideoQualityId): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QUALITY_KEY, quality);
  } catch {
    /* ignore */
  }
}

/** Resolve effective saver mode from user preference + browser Network Information. */
export function resolveEffectiveDataSaver(
  preference: DataSaverMode,
  opts: { saveData?: boolean; isSlowNetwork?: boolean }
): DataSaverMode {
  if (preference === "ultra") return "ultra";
  if (preference === "saver") return "saver";
  if (opts.saveData) return "saver";
  if (opts.isSlowNetwork) return "saver";
  return "off";
}

export function shouldDeferMediaLoad(mode: DataSaverMode): boolean {
  return mode === "saver" || mode === "ultra";
}

export function shouldUseUltraDataSaver(mode: DataSaverMode): boolean {
  return mode === "ultra";
}

/** Map network + preference to a playback quality hint (client-side only). */
export function resolveAutoVideoQuality(
  mode: DataSaverMode,
  preference: VideoQualityId,
  opts: { isSlowNetwork?: boolean; saveData?: boolean }
): VideoQualityId {
  if (preference !== "auto") return preference;
  if (mode === "ultra") return "audio";
  if (mode === "saver" || opts.saveData || opts.isSlowNetwork) return "360p";
  return "720p";
}

export function videoPreloadForQuality(
  quality: VideoQualityId,
  shouldPlay: boolean
): "none" | "metadata" | "auto" {
  if (quality === "audio") return "metadata";
  if (!shouldPlay) return "metadata";
  if (quality === "240p" || quality === "360p") return "metadata";
  return "auto";
}
