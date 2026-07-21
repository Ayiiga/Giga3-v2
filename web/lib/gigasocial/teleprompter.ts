export const DEFAULT_TELEPROMPTER_SCRIPT =
  "Welcome to GigaSocial!\n\nIntroduce your topic, speak naturally, and let the teleprompter guide you while you record.";

export function clampTeleprompterSpeed(speed: number): number {
  return Math.min(120, Math.max(20, speed));
}

export function clampTeleprompterFontSize(size: number): number {
  return Math.min(36, Math.max(14, size));
}

export function clampTeleprompterMargin(marginPx: number): number {
  return Math.min(48, Math.max(0, marginPx));
}

export function clampTeleprompterCountdown(seconds: number): number {
  return Math.min(10, Math.max(0, Math.round(seconds)));
}

/** Advance scroll offset in pixels for teleprompter text. */
export function advanceTeleprompterOffset(
  offsetPx: number,
  speedPxPerSec: number,
  deltaMs: number,
  paused: boolean
): number {
  if (paused || deltaMs <= 0) return offsetPx;
  return offsetPx + (speedPxPerSec * deltaMs) / 1000;
}
