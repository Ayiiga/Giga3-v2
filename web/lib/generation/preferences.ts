const SOUND_KEY = "giga3_gen_sound";
const BROWSER_NOTIFY_KEY = "giga3_gen_browser_notify";

export function readGenerationSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SOUND_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeGenerationSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SOUND_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore quota */
  }
}

export function readGenerationBrowserNotifyEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(BROWSER_NOTIFY_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeGenerationBrowserNotifyEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BROWSER_NOTIFY_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore quota */
  }
}
