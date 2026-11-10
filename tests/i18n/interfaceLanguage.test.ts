import { describe, expect, it } from "vitest";
import { resolveInterfaceLanguage } from "../../web/lib/i18n/interfaceLanguage";

describe("interface language", () => {
  it("uses French for a phone set to French in Burkina Faso", () => {
    expect(resolveInterfaceLanguage("system", ["fr-BF", "en"])).toBe("fr");
  });

  it("honors device language order and falls back to English", () => {
    expect(resolveInterfaceLanguage("system", ["en-GH", "fr-BF"])).toBe("en");
    expect(resolveInterfaceLanguage("system", ["ff-BF", "fr-BF"])).toBe("fr");
    expect(resolveInterfaceLanguage("system", ["mos-BF"])).toBe("en");
    expect(resolveInterfaceLanguage("system", [])).toBe("en");
  });

  it("honors explicit preferences over device languages", () => {
    expect(resolveInterfaceLanguage("en", ["fr-BF"])).toBe("en");
    expect(resolveInterfaceLanguage("fr", ["en-GH"])).toBe("fr");
  });
});
