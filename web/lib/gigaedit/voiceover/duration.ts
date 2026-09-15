/** Safe duration formatting — never surfaces NaN:NaN on low-end devices. */

export function safeDurationSec(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value) || Number.isNaN(value)) return 0;
  return Math.max(0, value);
}

/** mm:ss display (e.g. voiceover timer, audio duration). */
export function formatSafeMmSs(seconds: number | null | undefined): string {
  const total = Math.floor(safeDurationSec(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

/** Timecode with ms — guards NaN for timeline labels. */
export function formatSafeTimecodeMs(sec: number | null | undefined, fps = 30): string {
  const safe = safeDurationSec(sec);
  const totalMs = Math.round(safe * 1000);
  const minutes = Math.floor(totalMs / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const ms = totalMs % 1000;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}
