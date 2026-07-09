"use client";

import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo } from "react";
import {
  DEFAULT_ONBOARDING,
  DEFAULT_USER_PREFERENCES,
  type OnboardingState,
  type UserPreferences,
} from "@/lib/platform/types";

export function usePlatformProfile() {
  const sessionToken = getSessionToken();
  const args = sessionToken ? { sessionToken } : "skip";

  const profile = useQuery(api.platformProfile.getPlatformProfile, args);
  const saveOnboarding = useMutation(api.platformProfile.saveOnboarding);
  const savePreferences = useMutation(api.platformProfile.saveUserPreferences);
  const recordActivity = useMutation(api.platformProfile.recordDailyActivity);

  const onboarding: OnboardingState = useMemo(() => {
    if (!profile?.onboardingState) return DEFAULT_ONBOARDING;
    return { ...DEFAULT_ONBOARDING, ...profile.onboardingState };
  }, [profile]);

  const preferences: UserPreferences = useMemo(() => {
    if (!profile?.userPreferences) return DEFAULT_USER_PREFERENCES;
    return { ...DEFAULT_USER_PREFERENCES, ...profile.userPreferences };
  }, [profile]);

  const completeOnboarding = useCallback(
    async (role: OnboardingState["role"], stepsSeen: string[]) => {
      const token = getSessionToken();
      if (!token) return;
      await saveOnboarding({
        sessionToken: token,
        role,
        stepsSeen,
        completed: true,
      });
    },
    [saveOnboarding]
  );

  const updatePreferences = useCallback(
    async (patch: Partial<UserPreferences>) => {
      const token = getSessionToken();
      if (!token) return;
      const next = { ...preferences, ...patch };
      await savePreferences({
        sessionToken: token,
        preferencesJson: JSON.stringify(next),
      });
    },
    [preferences, savePreferences]
  );

  const trackDailyActivity = useCallback(async () => {
    const token = getSessionToken();
    if (!token) return;
    await recordActivity({ sessionToken: token });
  }, [recordActivity]);

  return {
    profile,
    onboarding,
    preferences,
    needsOnboarding: profile && !profile.onboardingCompletedAt,
    completeOnboarding,
    updatePreferences,
    trackDailyActivity,
    referralCode: profile?.referralCode ?? null,
    learningStreak: profile?.learningStreakDays ?? 0,
  };
}
