/** Active GigaSocial creator account (multi-profile, max 3). */

const ACTIVE_PROFILE_KEY = "giga3_active_social_profile_id";

export type SocialAccountSummary = {
  profileId: string;
  displayName: string;
  handle: string;
  avatarUrl?: string;
  isMain: boolean;
  accountLabel: string;
};

export function readActiveSocialProfileId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_PROFILE_KEY);
  } catch {
    return null;
  }
}

export function writeActiveSocialProfileId(profileId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!profileId) {
      window.localStorage.removeItem(ACTIVE_PROFILE_KEY);
      return;
    }
    window.localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
  } catch {
    /* private mode */
  }
}

export function resolveActiveSocialAccount(
  accounts: SocialAccountSummary[]
): SocialAccountSummary | null {
  if (!accounts.length) return null;
  const stored = readActiveSocialProfileId();
  const match = stored ? accounts.find((account) => account.profileId === stored) : null;
  if (match) return match;
  return accounts.find((account) => account.isMain) ?? accounts[0] ?? null;
}
