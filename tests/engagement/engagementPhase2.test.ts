import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ENGAGEMENT_FLAG_DEFAULTS,
  ENGAGEMENT_FLAG_KEYS,
} from "../../convex/engagementControls";
import { DEFAULT_ONBOARDING } from "../../web/lib/platform/types";

const root = resolve(__dirname, "../..");

describe("engagement Phase 2 — flags default OFF", () => {
  it("defines engagement remote-config keys all disabled by default", () => {
    expect(ENGAGEMENT_FLAG_KEYS.length).toBeGreaterThanOrEqual(4);
    for (const key of ENGAGEMENT_FLAG_KEYS) {
      expect(ENGAGEMENT_FLAG_DEFAULTS[key].enabled).toBe(false);
    }
  });

  it("wires engagement defaults into remoteConfig and client isEnabled", () => {
    const remote = readFileSync(resolve(root, "convex/remoteConfig.ts"), "utf8");
    const hook = readFileSync(resolve(root, "web/hooks/useRemoteConfig.ts"), "utf8");
    expect(remote).toContain("ENGAGEMENT_FLAG_DEFAULTS");
    expect(remote).toContain("getEngagementConfigAdmin");
    expect(hook).toContain('key.startsWith("engagement.")');
  });
});

describe("engagement Phase 2 — welcome persistence", () => {
  it("extends onboarding state with welcome/interest/checklist fields", () => {
    expect(DEFAULT_ONBOARDING).toMatchObject({
      completed: false,
      stepsSeen: [],
      dismissedTips: [],
    });
    const types = readFileSync(resolve(root, "web/lib/platform/types.ts"), "utf8");
    expect(types).toContain("welcomeDismissedAt");
    expect(types).toContain("interests?");
    expect(types).toContain("checklistCompleted?");
  });

  it("merges engagement patches without wiping classic onboarding", () => {
    const profile = readFileSync(resolve(root, "convex/platformProfile.ts"), "utf8");
    expect(profile).toContain("export const patchEngagementOnboarding");
    expect(profile).toContain("...existing");
    expect(profile).toContain("welcomeDismissedAt");
    // saveOnboarding must preserve prior engagement fields
    const saveBlock =
      profile.match(/export const saveOnboarding = mutation\([\s\S]*?\n\}\);/)?.[0] ?? "";
    expect(saveBlock).toContain("...existing");
  });

  it("ships welcome + checklist UI behind EngagementHost", () => {
    const host = readFileSync(
      resolve(root, "web/components/engagement/EngagementHost.tsx"),
      "utf8"
    );
    const deferred = readFileSync(
      resolve(root, "web/components/pwa/DeferredPwaChrome.tsx"),
      "utf8"
    );
    expect(host).toContain("engagement.welcome");
    expect(host).toContain("engagement.checklist");
    expect(host).toContain("engagement.kill_switch");
    expect(host).toContain("WelcomeExperience");
    expect(host).toContain("FirstSessionChecklist");
    expect(deferred).toContain("EngagementHost");
  });

  it("does not enable GigaSocial DM flags", () => {
    const flags = readFileSync(
      resolve(root, "web/lib/gigasocial/featureFlags.ts"),
      "utf8"
    );
    expect(flags).toContain("enableDirectMessages: envFlag(\"NEXT_PUBLIC_GIGASOCIAL_DM\", false)");
  });
});
