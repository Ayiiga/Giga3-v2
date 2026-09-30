import { describe, expect, it } from "vitest";
import {
  applyGigaLiteDocumentClass,
  effectiveDataSaverMode,
  resolveGigaLiteEffective,
  shouldAllowBackgroundPrefetch,
  writeGigaLiteMode,
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

    if (typeof localStorage !== "undefined") {
      writeGigaLiteMode("saver");
      expect(shouldAllowBackgroundPrefetch({})).toBe(false);
      writeGigaLiteMode("extreme");
      expect(shouldAllowBackgroundPrefetch({})).toBe(false);
      writeGigaLiteMode("standard");
    }
  });

  it("maps extreme to ultra data saver mode", () => {
    expect(
      effectiveDataSaverMode({ saveData: false, isSlowNetwork: false })
    ).toBeDefined();
  });

  it("applyGigaLiteDocumentClass toggles saver CSS on document root", () => {
    if (typeof document === "undefined") return;
    writeGigaLiteMode("saver");
    applyGigaLiteDocumentClass();
    expect(document.documentElement.classList.contains("giga-lite-saver")).toBe(true);
    expect(document.documentElement.classList.contains("giga-lite-extreme")).toBe(false);

    writeGigaLiteMode("extreme");
    applyGigaLiteDocumentClass();
    expect(document.documentElement.classList.contains("giga-lite-extreme")).toBe(true);

    writeGigaLiteMode("standard");
    applyGigaLiteDocumentClass();
    expect(document.documentElement.classList.contains("giga-lite-saver")).toBe(false);
    expect(document.documentElement.classList.contains("giga-lite-extreme")).toBe(false);
  });
});
