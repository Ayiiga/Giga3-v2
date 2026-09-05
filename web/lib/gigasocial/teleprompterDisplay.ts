export type TeleprompterColorId =
  | "white"
  | "gray"
  | "black"
  | "pink"
  | "orange"
  | "yellow"
  | "mint";

export const TELEPROMPTER_COLOR_OPTIONS: ReadonlyArray<{
  id: TeleprompterColorId;
  value: string;
  label: string;
}> = [
  { id: "white", value: "#FFFFFF", label: "White" },
  { id: "gray", value: "#C5CED8", label: "Gray" },
  { id: "black", value: "#0F172A", label: "Black" },
  { id: "pink", value: "#FDA4AF", label: "Pink" },
  { id: "orange", value: "#FB923C", label: "Orange" },
  { id: "yellow", value: "#FDE047", label: "Yellow" },
  { id: "mint", value: "#4ADE80", label: "Mint" },
];

export const DEFAULT_TELEPROMPTER_COLOR_ID: TeleprompterColorId = "mint";

export function resolveTeleprompterColor(id: TeleprompterColorId): string {
  return (
    TELEPROMPTER_COLOR_OPTIONS.find((option) => option.id === id)?.value ??
    TELEPROMPTER_COLOR_OPTIONS[0].value
  );
}

export function splitTeleprompterLines(script: string): string[] {
  const trimmed = script.trim();
  if (!trimmed) return [];
  return trimmed.split("\n");
}

/** Estimate active line from scroll offset (studio overlay). */
export function getActiveTeleprompterLineIndex(
  offsetPx: number,
  fontSizePx: number,
  lineHeight = 1.38
): number {
  const lineHeightPx = fontSizePx * lineHeight;
  if (lineHeightPx <= 0) return 0;
  return Math.max(0, Math.floor(offsetPx / lineHeightPx));
}

export function getTeleprompterLineAppearance(
  lineIndex: number,
  activeLineIndex: number,
  accentColor: string
): { color: string; opacity: number; fontWeight: 600 | 700 } {
  const inActiveWindow = lineIndex >= activeLineIndex && lineIndex <= activeLineIndex + 1;
  if (inActiveWindow) {
    return { color: accentColor, opacity: 1, fontWeight: 700 };
  }
  if (lineIndex < activeLineIndex) {
    return { color: "#E2E8F0", opacity: 0.42, fontWeight: 600 };
  }
  return { color: "#CBD5E1", opacity: 0.62, fontWeight: 600 };
}

export function mapSpeedToLabel(speed: number): string {
  if (speed <= 40) return "Slow";
  if (speed >= 90) return "Fast";
  return "Medium";
}

export function mapFontSizeToLabel(fontSize: number): string {
  if (fontSize <= 20) return "Small";
  if (fontSize >= 30) return "Big";
  return "Medium";
}
