import { describe, expect, it } from "vitest";
import {
  PHASE5_FLAG_DEFAULTS,
  PHASE5_FLAG_KEYS,
} from "../../convex/phase5Controls";
import {
  PHASE5_FLAG_DEFAULTS as CLIENT_DEFAULTS,
  PHASE5_FLAG_REMOTE_KEYS,
  mergeRemotePhase5Flags,
} from "../../web/lib/phase5Flags";

describe("Phase 5 public-beta flags", () => {
  it("defines ten module keys", () => {
    expect(PHASE5_FLAG_KEYS).toHaveLength(10);
    expect(PHASE5_FLAG_KEYS).toContain("phase5.beta");
    expect(PHASE5_FLAG_KEYS).toContain("phase5.admin_tools");
  });

  it("defaults keep all Phase 5 modules OFF (safe expansion posture)", () => {
    for (const key of PHASE5_FLAG_KEYS) {
      expect(PHASE5_FLAG_DEFAULTS[key].enabled).toBe(false);
    }
    for (const value of Object.values(CLIENT_DEFAULTS)) {
      expect(value).toBe(false);
    }
  });

  it("mergeRemotePhase5Flags enables only keys remote turns on", () => {
    const merged = mergeRemotePhase5Flags({
      "phase5.beta": { enabled: true, value: "enabled" },
      "phase5.feedback": { enabled: false, value: "disabled" },
    });
    expect(merged.beta).toBe(true);
    expect(merged.feedback).toBe(false);
    expect(merged.creatorSuccess).toBe(false);
    expect(merged.personalization).toBe(false);
  });

  it("documents remote key mapping", () => {
    expect(PHASE5_FLAG_REMOTE_KEYS.beta).toBe("phase5.beta");
    expect(PHASE5_FLAG_REMOTE_KEYS.monetizationBeta).toBe(
      "phase5.monetization_beta"
    );
  });
});
