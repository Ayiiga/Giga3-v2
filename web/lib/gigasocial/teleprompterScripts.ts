import { DEFAULT_TELEPROMPTER_SCRIPT } from "@/lib/gigasocial/teleprompter";

const STORAGE_KEY = "giga3_gigasocial_teleprompter_script";
const SETTINGS_KEY = "giga3_gigasocial_teleprompter_settings";

export type TeleprompterSettings = {
  speed: number;
  fontSize: number;
  marginPx: number;
  mirror: boolean;
  darkMode: boolean;
  transparentMode: boolean;
  countdownSec: number;
  floating: boolean;
};

export const DEFAULT_TELEPROMPTER_SETTINGS: TeleprompterSettings = {
  speed: 48,
  fontSize: 18,
  marginPx: 12,
  mirror: false,
  darkMode: true,
  transparentMode: false,
  countdownSec: 3,
  floating: false,
};

export function loadTeleprompterScript(): string {
  if (typeof window === "undefined") return DEFAULT_TELEPROMPTER_SCRIPT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && raw.trim()) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_TELEPROMPTER_SCRIPT;
}

export function saveTeleprompterScript(script: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, script);
  } catch {
    /* ignore */
  }
}

export function loadTeleprompterSettings(): TeleprompterSettings {
  if (typeof window === "undefined") return DEFAULT_TELEPROMPTER_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_TELEPROMPTER_SETTINGS;
    return { ...DEFAULT_TELEPROMPTER_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_TELEPROMPTER_SETTINGS;
  }
}

export function saveTeleprompterSettings(settings: Partial<TeleprompterSettings>): void {
  if (typeof window === "undefined") return;
  try {
    const next = { ...loadTeleprompterSettings(), ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function generateTeleprompterScript(topic: string): string {
  const clean = topic.trim() || "today's topic";
  return [
    `Welcome — today we're talking about ${clean}.`,
    "",
    "Hook: Share why this matters to your audience in one sentence.",
    "",
    "Point 1: Explain the core idea simply.",
    "Point 2: Give a practical example from Africa or your community.",
    "Point 3: Offer one action viewers can take today.",
    "",
    "Close: Ask a question, invite comments, and thank your viewers.",
  ].join("\n");
}
