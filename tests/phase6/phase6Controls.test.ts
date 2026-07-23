import { describe, expect, it } from "vitest";
import {
  PHASE6_FLAG_DEFAULTS,
  PHASE6_FLAG_KEYS,
} from "../../convex/phase6Controls";
import {
  PHASE6_FLAG_DEFAULTS as CLIENT_DEFAULTS,
  PHASE6_FLAG_REMOTE_KEYS,
  mergeRemotePhase6Flags,
} from "../../web/lib/phase6Flags";

describe("Phase 6 Africa-launch flags", () => {
  it("defines ten module keys", () => {
    expect(PHASE6_FLAG_KEYS).toHaveLength(10);
    expect(PHASE6_FLAG_KEYS).toContain("phase6.multi_region");
    expect(PHASE6_FLAG_KEYS).toContain("phase6.admin_tools");
  });

  it("defaults keep all Phase 6 modules OFF", () => {
    for (const key of PHASE6_FLAG_KEYS) {
      expect(PHASE6_FLAG_DEFAULTS[key].enabled).toBe(false);
    }
    for (const value of Object.values(CLIENT_DEFAULTS)) {
      expect(value).toBe(false);
    }
  });

  it("mergeRemotePhase6Flags enables only keys remote turns on", () => {
    const merged = mergeRemotePhase6Flags({
      "phase6.multi_region": { enabled: true, value: "enabled" },
      "phase6.commerce": { enabled: false, value: "disabled" },
    });
    expect(merged.multiRegion).toBe(true);
    expect(merged.commerce).toBe(false);
    expect(merged.aiPlatform).toBe(false);
  });

  it("documents remote key mapping", () => {
    expect(PHASE6_FLAG_REMOTE_KEYS.multiRegion).toBe("phase6.multi_region");
    expect(PHASE6_FLAG_REMOTE_KEYS.orgAccounts).toBe("phase6.org_accounts");
  });
});
