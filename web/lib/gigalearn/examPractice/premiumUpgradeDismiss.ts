/**
 * Persist “Maybe later” for the post-trial premium modal.
 * Dismissal is per browser (localStorage) for a cooldown window so we do not
 * re-interrupt, while the Exam Practice centre still surfaces the offer.
 */

const STORAGE_KEY = "giga3_exam_premium_upgrade_dismiss_v1";

/** Do not auto-show the modal again for 7 days after dismiss. */
export const PREMIUM_UPGRADE_DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

type DismissRecord = {
  dismissedAt: number;
  setId: string;
};

export function isPremiumUpgradeModalSuppressed(
  setId: string,
  now = Date.now()
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as DismissRecord;
    if (!parsed || typeof parsed.dismissedAt !== "number") return false;
    if (parsed.setId !== setId) return false;
    return now - parsed.dismissedAt < PREMIUM_UPGRADE_DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

export function dismissPremiumUpgradeModal(setId: string, now = Date.now()): void {
  if (typeof window === "undefined") return;
  try {
    const record: DismissRecord = { dismissedAt: now, setId };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* private mode */
  }
}

export function clearPremiumUpgradeModalDismiss(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
