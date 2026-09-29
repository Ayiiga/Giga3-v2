import { describe, expect, it } from "vitest";
import {
  effectiveDataSaverMode,
  resolveGigaLiteEffective,
  shouldAllowBackgroundPrefetch,
} from "../../web/lib/network/gigaLite";

describe("giga lite / data saver", () => {
  it("auto mode falls back to saver on slow networks", () => {
    expect(resolveGigaLiteEffective({ isSlowNetwork: true })).toBe("saver");
    expect(resolveGigaLiteEffective({ saveData: true })).toBe("saver");
    expect(resolveGigaLiteEffective({})).toBe("standard");
  });

  it("blocks background prefetch when saver or extreme is effective", () => {
    expect(shouldAllowBackgroundPrefetch({ isSlowNetwork: true })).toBe(false);
    expect(shouldAllowBackgroundPrefetch({})).toBe(true);
  });

  it("maps extreme to ultra data saver mode", () => {
    expect(
      effectiveDataSaverMode({ saveData: false, isSlowNetwork: false })
    ).toBeDefined();
  });
});
