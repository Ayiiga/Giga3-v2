const DISMISS_KEY = "giga3_install_prompt_dismissed";
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

type DismissRecord = { until: number };

export function isInstallPromptDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as DismissRecord;
    if (!parsed.until || Date.now() > parsed.until) {
      localStorage.removeItem(DISMISS_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function dismissInstallPrompt(): void {
  if (typeof window === "undefined") return;
  try {
    const record: DismissRecord = { until: Date.now() + DISMISS_MS };
    localStorage.setItem(DISMISS_KEY, JSON.stringify(record));
  } catch {
    /* ignore quota / private mode */
  }
}
