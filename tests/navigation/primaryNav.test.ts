import { describe, expect, it } from "vitest";
import {
  isPrimaryNavRoute,
  resolvePrimaryNavTab,
  shouldShowDesktopRail,
} from "../../web/lib/navigation/primaryNav";

describe("primaryNav route matching", () => {
  it("marks the four product destinations as primary nav routes", () => {
    expect(isPrimaryNavRoute("/chat")).toBe(true);
    expect(isPrimaryNavRoute("/chat/")).toBe(true);
    expect(isPrimaryNavRoute("/media")).toBe(true);
    expect(isPrimaryNavRoute("/gigaedit")).toBe(true);
    expect(isPrimaryNavRoute("/gigasocial/")).toBe(true);
    expect(isPrimaryNavRoute("/gigasocial/profile")).toBe(true);
  });

  it("hides nav on login, share, and payment routes", () => {
    expect(isPrimaryNavRoute("/chat/login")).toBe(false);
    expect(isPrimaryNavRoute("/chat/share/abc")).toBe(false);
    expect(isPrimaryNavRoute("/payment/success")).toBe(false);
  });

  it("does not treat marketing pages as primary nav routes", () => {
    expect(isPrimaryNavRoute("/pricing")).toBe(false);
    expect(isPrimaryNavRoute("/blog")).toBe(false);
    expect(isPrimaryNavRoute("/")).toBe(false);
  });

  it("resolves active tabs from pathname", () => {
    expect(resolvePrimaryNavTab("/chat")).toBe("home");
    expect(resolvePrimaryNavTab("/media?tab=video")).toBe("studio");
    expect(resolvePrimaryNavTab("/gigaedit/?tab=video")).toBe("edits");
    expect(resolvePrimaryNavTab("/gigasocial/?tab=feed")).toBe("social");
  });

  it("shows desktop rail for studio/edits/social but not chat", () => {
    expect(shouldShowDesktopRail("/media")).toBe(true);
    expect(shouldShowDesktopRail("/gigaedit")).toBe(true);
    expect(shouldShowDesktopRail("/gigasocial/")).toBe(true);
    expect(shouldShowDesktopRail("/chat")).toBe(false);
  });
});
