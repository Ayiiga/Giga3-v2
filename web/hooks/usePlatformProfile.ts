"use client";

import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import {
  DEFAULT_ONBOARDING,
  DEFAULT_USER_PREFERENCES,
  type OnboardingState,
  type UserPreferences,
} from "@/lib/platform/types";
import type { UserRoleId } from "@/lib/vision";

export type UpdatePreferencesResult =
  | { ok: true }
  | { ok: false; error: string };

export function usePlatformProfile() {
  const sessionToken = getSessionToken();
  const args = sessionToken ? { sessionToken } : "skip";

  const profile = useQuery(api.platformProfile.getPlatformProfile, args);
  const saveOnboarding = useMutation(api.platformProfile.saveOnboarding);
  const savePreferences = useMutation(api.platformProfile.saveUserPreferences);
  const updateUserRole = useMutation(api.platformProfile.updateUserRole);
  const recordActivity = useMutation(api.platformProfile.recordDailyActivity);

  const isLoading = sessionToken ? profile === undefined : false;

  const onboarding: OnboardingState = useMemo(() => {
    if (!profile?.onboardingState) return DEFAULT_ONBOARDING;
    return { ...DEFAULT_ONBOARDING, ...profile.onboardingState };
  }, [profile]);

  const preferences: UserPreferences = useMemo(() => {
    if (!profile?.userPreferences) return DEFAULT_USER_PREFERENCES;
    return { ...DEFAULT_USER_PREFERENCES, ...profile.userPreferences };
  }, [profile]);

  const userRole: UserRoleId = (profile?.userRole as UserRoleId) ?? "general";

  const completeOnboarding = useCallback(
    async (role: OnboardingState["role"], stepsSeen: string[]) => {
      const token = getSessionToken();
      if (!token) return { ok: false as const, error: "Sign in required." };
      try {
        await saveOnboarding({
          sessionToken: token,
          role,
          stepsSeen,
          completed: true,
        });
        return { ok: true as const };
      } catch (e) {
        return {
          ok: false as const,
          error: e instanceof Error ? e.message : "Could not save onboarding.",
        };
      }
    },
    [saveOnboarding]
  );

  const updatePreferences = useCallback(
    async (patch: Partial<UserPreferences>): Promise<UpdatePreferencesResult> => {
      const token = getSessionToken();
      if (!token) return { ok: false, error: "Sign in required." };
      const next = { ...preferences, ...patch };
      try {
        await savePreferences({
          sessionToken: token,
          preferencesJson: JSON.stringify(next),
        });
        return { ok: true };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : "Could not save settings.",
        };
      }
    },
    [preferences, savePreferences]
  );

  const saveUserRole = useCallback(
    async (role: UserRoleId): Promise<UpdatePreferencesResult> => {
      const token = getSessionToken();
      if (!token) return { ok: false, error: "Sign in required." };
      try {
        await updateUserRole({ sessionToken: token, role });
        return { ok: true };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : "Could not update role.",
        };
      }
    },
    [updateUserRole]
  );

  const trackDailyActivity = useCallback(async () => {
    const token = getSessionToken();
    if (!token) return;
    await recordActivity({ sessionToken: token });
  }, [recordActivity]);

  return {
    profile,
    isLoading,
    onboarding,
    preferences,
    userRole,
    needsOnboarding: profile && !profile.onboardingCompletedAt,
    completeOnboarding,
    updatePreferences,
    saveUserRole,
    trackDailyActivity,
    referralCode: profile?.referralCode ?? null,
    learningStreak: profile?.learningStreakDays ?? 0,
  };
}
