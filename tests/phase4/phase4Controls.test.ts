import { describe, expect, it } from "vitest";
import {
  PHASE4_FLAG_DEFAULTS,
  PHASE4_FLAG_KEYS,
} from "../../convex/phase4Controls";
import {
  PRODUCTION_FLAG_DEFAULTS,
  PRODUCTION_FLAG_REMOTE_KEYS,
  mergeRemotePhase4Flags,
} from "../../web/lib/productionFlags";

describe("Phase 4 controlled upgrade flags", () => {
  it("defines all five release-group keys", () => {
    expect(PHASE4_FLAG_KEYS).toEqual([
      "phase4.security",
      "phase4.monitoring",
      "phase4.offline",
      "phase4.admin_tools",
      "phase4.reliability",
    ]);
  });

  it("defaults keep production behavior on (safe upgrade posture)", () => {
    for (const key of PHASE4_FLAG_KEYS) {
      expect(PHASE4_FLAG_DEFAULTS[key].enabled).toBe(true);
    }
  });

  it("client telemetry remains off by default", () => {
    expect(PRODUCTION_FLAG_DEFAULTS.clientTelemetry).toBe(false);
  });

  it("mergeRemotePhase4Flags disables offline hints when remote says so", () => {
    const merged = mergeRemotePhase4Flags({
      "phase4.offline": { enabled: false, value: "disabled" },
      "phase4.reliability": { enabled: true, value: "enabled" },
      "phase4.monitoring": { enabled: true, value: "enabled" },
    });
    expect(merged.offlineRecoveryHints).toBe(false);
    expect(merged.safeAsyncNetwork).toBe(true);
    expect(merged.clientTelemetry).toBe(false);
  });

  it("documents remote key mapping", () => {
    expect(PRODUCTION_FLAG_REMOTE_KEYS.offlineRecoveryHints).toBe("phase4.offline");
    expect(PRODUCTION_FLAG_REMOTE_KEYS.safeAsyncNetwork).toBe("phase4.reliability");
  });
});
