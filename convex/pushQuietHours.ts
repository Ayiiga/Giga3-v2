type QuietHoursPrefs = {
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  notificationsEnabled?: boolean;
};

/** Returns true when push should be suppressed for the user's quiet-hours window. */
export function isWithinQuietHours(
  prefs: QuietHoursPrefs | null | undefined,
  now = new Date()
): boolean {
  if (!prefs?.quietHoursEnabled) return false;
  const start = prefs.quietHoursStart?.trim();
  const end = prefs.quietHoursEnd?.trim();
  if (!start || !end) return false;

  const toMinutes = (hhmm: string): number | null => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  };

  const startMin = toMinutes(start);
  const endMin = toMinutes(end);
  if (startMin === null || endMin === null) return false;

  const currentMin = now.getHours() * 60 + now.getMinutes();
  if (startMin === endMin) return true;
  if (startMin < endMin) {
    return currentMin >= startMin && currentMin < endMin;
  }
  return currentMin >= startMin || currentMin < endMin;
}

export function parseUserPreferencesJson(raw: string | undefined): QuietHoursPrefs | null {
  if (!raw?.trim()) return null;
  try {
    return JSON.parse(raw) as QuietHoursPrefs;
  } catch {
    return null;
  }
}
