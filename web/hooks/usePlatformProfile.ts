"use client";

import { getSessionToken, getUserEmail } from "@/lib/auth";
import { isSupabaseDataBackend } from "@/lib/dataBackend";
import {
  DEFAULT_ONBOARDING,
  DEFAULT_USER_PREFERENCES,
  type OnboardingState,
  type UserPreferences,
} from "@/lib/platform/types";
import {
  getSupabasePlatformProfile,
  recordSupabaseDailyActivity,
  saveSupabaseOnboarding,
  saveSupabaseUserPreferences,
  saveSupabaseUserRole,
  type SupabasePlatformProfile,
} from "@/lib/supabase/data";
import type { UserRoleId } from "@/lib/vision";
import { api } from "convex/_generated/api";
import { useConvex, useMutation } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";

export type UpdatePreferencesResult =
  | { ok: true }
  | { ok: false; error: string };

type ConvexPlatformProfile = {
  userRole?: string;
  onboardingState?: OnboardingState | null;
  userPreferences?: UserPreferences | null;
  referralCode?: string | null;
  learningStreakDays?: number;
  onboardingCompletedAt?: number | null;
} | null;

function mapConvexProfile(profile: ConvexPlatformProfile): SupabasePlatformProfile | null {
  if (!profile) return null;
  return {
    userRole: (profile.userRole as UserRoleId) ?? "general",
    onboardingState: profile.onboardingState
      ? { ...DEFAULT_ONBOARDING, ...profile.onboardingState }
      : DEFAULT_ONBOARDING,
    userPreferences: profile.userPreferences ?? null,
    referralCode: profile.referralCode ?? null,
    learningStreakDays: profile.learningStreakDays ?? 0,
    onboardingCompletedAt: profile.onboardingCompletedAt ?? null,
  };
}

export function usePlatformProfile() {
  const sessionToken = getSessionToken();
  const useSupabase = isSupabaseDataBackend();
  const convex = useConvex();

  const [profile, setProfile] = useState<SupabasePlatformProfile | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(sessionToken));

  const saveOnboardingMutation = useMutation(api.platformProfile.saveOnboarding);
  const savePreferencesMutation = useMutation(api.platformProfile.saveUserPreferences);
  const updateUserRoleMutation = useMutation(api.platformProfile.updateUserRole);
  const recordActivityMutation = useMutation(api.platformProfile.recordDailyActivity);

  useEffect(() => {
    if (!sessionToken) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const load = async () => {
      try {
        if (useSupabase) {
          const email = getUserEmail();
          if (!email) {
            if (!cancelled) setProfile(null);
            return;
          }
          const next = await getSupabasePlatformProfile(email);
          if (!cancelled) setProfile(next);
          return;
        }

        const next = await convex.query(api.platformProfile.getPlatformProfile, {
          sessionToken,
        });
        if (!cancelled) setProfile(mapConvexProfile(next));
      } catch (error) {
        console.warn("[usePlatformProfile] load failed — using defaults", error);
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [convex, sessionToken, useSupabase]);

  const onboarding: OnboardingState = useMemo(() => {
    if (!profile?.onboardingState) return DEFAULT_ONBOARDING;
    return { ...DEFAULT_ONBOARDING, ...profile.onboardingState };
  }, [profile]);

  const preferences: UserPreferences = useMemo(() => {
    if (!profile?.userPreferences) return DEFAULT_USER_PREFERENCES;
    return { ...DEFAULT_USER_PREFERENCES, ...profile.userPreferences };
  }, [profile]);

  const userRole: UserRoleId = profile?.userRole ?? "general";

  const reloadProfile = useCallback(async () => {
    if (!sessionToken) return;
    if (useSupabase) {
      const email = getUserEmail();
      if (!email) return;
      setProfile(await getSupabasePlatformProfile(email));
      return;
    }
    try {
      const next = await convex.query(api.platformProfile.getPlatformProfile, {
        sessionToken,
      });
      setProfile(mapConvexProfile(next));
    } catch {
      setProfile(null);
    }
  }, [convex, sessionToken, useSupabase]);

  const completeOnboarding = useCallback(
    async (role: OnboardingState["role"], stepsSeen: string[]) => {
      const token = getSessionToken();
      const email = getUserEmail();
      if (!token) return { ok: false as const, error: "Sign in required." };
      try {
        if (useSupabase) {
          if (!email) return { ok: false as const, error: "Sign in required." };
          await saveSupabaseOnboarding(email, { role, stepsSeen, completed: true });
        } else {
          await saveOnboardingMutation({
            sessionToken: token,
            role,
            stepsSeen,
            completed: true,
          });
        }
        await reloadProfile();
        return { ok: true as const };
      } catch (e) {
        return {
          ok: false as const,
          error: e instanceof Error ? e.message : "Could not save onboarding.",
        };
      }
    },
    [reloadProfile, saveOnboardingMutation, useSupabase]
  );

  const updatePreferences = useCallback(
    async (patch: Partial<UserPreferences>): Promise<UpdatePreferencesResult> => {
      const token = getSessionToken();
      const email = getUserEmail();
      if (!token) return { ok: false, error: "Sign in required." };
      const next = { ...preferences, ...patch };
      try {
        if (useSupabase) {
          if (!email) return { ok: false, error: "Sign in required." };
          await saveSupabaseUserPreferences(email, next);
        } else {
          await savePreferencesMutation({
            sessionToken: token,
            preferencesJson: JSON.stringify(next),
          });
        }
        await reloadProfile();
        return { ok: true };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : "Could not save settings.",
        };
      }
    },
    [preferences, reloadProfile, savePreferencesMutation, useSupabase]
  );

  const saveUserRole = useCallback(
    async (role: UserRoleId): Promise<UpdatePreferencesResult> => {
      const token = getSessionToken();
      const email = getUserEmail();
      if (!token) return { ok: false, error: "Sign in required." };
      try {
        if (useSupabase) {
          if (!email) return { ok: false, error: "Sign in required." };
          await saveSupabaseUserRole(email, role);
        } else {
          await updateUserRoleMutation({ sessionToken: token, role });
        }
        await reloadProfile();
        return { ok: true };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : "Could not update role.",
        };
      }
    },
    [reloadProfile, updateUserRoleMutation, useSupabase]
  );

  const trackDailyActivity = useCallback(async () => {
    const token = getSessionToken();
    const email = getUserEmail();
    if (!token) return;
    try {
      if (useSupabase) {
        if (!email) return;
        await recordSupabaseDailyActivity(email);
        return;
      }
      await recordActivityMutation({ sessionToken: token });
    } catch {
      /* non-fatal */
    }
  }, [recordActivityMutation, useSupabase]);

  return {
    profile,
    isLoading,
    onboarding,
    preferences,
    userRole,
    needsOnboarding: Boolean(profile && !profile.onboardingCompletedAt),
    completeOnboarding,
    updatePreferences,
    saveUserRole,
    trackDailyActivity,
    referralCode: profile?.referralCode ?? null,
    learningStreak: profile?.learningStreakDays ?? 0,
  };
}
