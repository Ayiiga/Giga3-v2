const STORAGE_KEY = "gigasocial_video_muted";

/** User chose to mute stories/reels/feed video — default is unmuted. */
export function readVideoMutedPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function persistVideoMutedPreference(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (muted) window.sessionStorage.setItem(STORAGE_KEY, "1");
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
