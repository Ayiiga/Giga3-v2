/** Frame-accurate time helpers (30 fps default). */

export const DEFAULT_TIMELINE_FPS = 30;

export function roundToFrame(sec: number, fps = DEFAULT_TIMELINE_FPS): number {
  if (!Number.isFinite(sec)) return 0;
  const frame = Math.round(sec * fps);
  return frame / fps;
}

export function stepFrame(sec: number, deltaFrames: number, fps = DEFAULT_TIMELINE_FPS): number {
  return roundToFrame(sec + deltaFrames / fps, fps);
}

export function formatTimecodeMs(sec: number, fps = DEFAULT_TIMELINE_FPS): string {
  const safe = Math.max(0, sec);
  const totalMs = Math.round(safe * 1000);
  const minutes = Math.floor(totalMs / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const ms = totalMs % 1000;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

export function clampTimelineSec(sec: number, maxSec: number): number {
  return roundToFrame(Math.min(Math.max(0, sec), Math.max(0, maxSec)));
}
