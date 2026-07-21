/** Lightweight haptic helpers — no-ops when unsupported. */

export type HapticKind = "light" | "medium" | "success" | "error";

const PATTERNS: Record<HapticKind, number | number[]> = {
  light: 10,
  medium: 20,
  success: [10, 40, 10],
  error: [30, 40, 30],
};

export function canUseHaptics(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

export function triggerHaptic(kind: HapticKind = "light", enabled = true): void {
  if (!enabled || !canUseHaptics()) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    /* ignore */
  }
}
