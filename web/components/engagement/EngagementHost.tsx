"use client";

import { FirstSessionChecklist } from "@/components/engagement/FirstSessionChecklist";
import { WelcomeExperience } from "@/components/engagement/WelcomeExperience";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { usePlatformProfile } from "@/hooks/usePlatformProfile";
import { useRemoteConfig } from "@/hooks/useRemoteConfig";
import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import { useMutation } from "convex/react";
import { useMemo, useState } from "react";

type PatchArgs = {
  welcomeDismissed?: boolean;
  welcomeCompleted?: boolean;
  interests?: string[];
  checklistItemId?: string;
  checklistDismissed?: boolean;
};

/**
 * Central host for engagement prompts.
 * Priority: kill switch > welcome > checklist (rating reserved for Phase 3).
 * Never blocks the app if dismissed or skipped.
 */
function EngagementHostInner() {
  const sessionToken = getSessionToken();
  const { isEnabled, config } = useRemoteConfig();
  const { profile, onboarding, isLoading, reloadProfile } = usePlatformProfile();
  const patchEngagement = useMutation(api.platformProfile.patchEngagementOnboarding);
  const [localWelcomeGone, setLocalWelcomeGone] = useState(false);
  const [localChecklistGone, setLocalChecklistGone] = useState(false);

  const killSwitch = isEnabled("engagement.kill_switch");
  const welcomeOn = !killSwitch && isEnabled("engagement.welcome");
  const checklistOn = !killSwitch && isEnabled("engagement.checklist");
  const configReady = config !== undefined;

  const showWelcome = useMemo(() => {
    if (!sessionToken || !configReady || isLoading || !profile) return false;
    if (!welcomeOn || localWelcomeGone) return false;
    if (onboarding.welcomeDismissedAt || onboarding.welcomeCompletedAt) return false;
    // New accounts only — avoid surprising long-time users when the flag turns on.
    return !profile.onboardingCompletedAt;
  }, [
    sessionToken,
    configReady,
    isLoading,
    profile,
    welcomeOn,
    localWelcomeGone,
    onboarding.welcomeDismissedAt,
    onboarding.welcomeCompletedAt,
  ]);

  const showChecklist = useMemo(() => {
    if (!sessionToken || !configReady || isLoading || !profile) return false;
    if (!checklistOn || localChecklistGone || showWelcome) return false;
    if (onboarding.checklistDismissedAt) return false;
    const completed = onboarding.checklistCompleted ?? {};
    return Object.keys(completed).length < 7;
  }, [
    sessionToken,
    configReady,
    isLoading,
    profile,
    checklistOn,
    localChecklistGone,
    showWelcome,
    onboarding.checklistDismissedAt,
    onboarding.checklistCompleted,
  ]);

  async function persist(args: PatchArgs) {
    if (!sessionToken) return;
    try {
      await patchEngagement({ sessionToken, ...args });
      await reloadProfile();
    } catch {
      /* non-fatal — local dismiss still applied */
    }
  }

  if (!sessionToken || !configReady) return null;

  return (
    <>
      {showWelcome ? (
        <WelcomeExperience
          onDismiss={() => {
            setLocalWelcomeGone(true);
            void persist({ welcomeDismissed: true });
          }}
          onComplete={(interests) => {
            setLocalWelcomeGone(true);
            void persist({
              welcomeCompleted: true,
              welcomeDismissed: true,
              interests,
            });
          }}
        />
      ) : null}
      {showChecklist ? (
        <FirstSessionChecklist
          completedIds={Object.keys(onboarding.checklistCompleted ?? {})}
          onDismiss={() => {
            setLocalChecklistGone(true);
            void persist({ checklistDismissed: true });
          }}
          onMarkComplete={(id) => {
            void persist({ checklistItemId: id });
          }}
        />
      ) : null}
    </>
  );
}

/** Lazy-safe mount: only runs Convex hooks inside ConvexAppShell. */
export function EngagementHost() {
  return (
    <ConvexAppShell>
      <EngagementHostInner />
    </ConvexAppShell>
  );
}
