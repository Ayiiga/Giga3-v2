import { describe, expect, it } from "vitest";
import {
  PRIMARY_NAV_TABS,
  isPrimaryNavRoute,
  resolvePrimaryNavTab,
  shouldShowDesktopRail,
} from "../../web/lib/navigation/primaryNav";
import { isRetiredProductPath } from "../../web/lib/navigation/retiredProducts";

describe("primaryNav route matching", () => {
  it("marks the five education-first destinations as primary nav routes", () => {
    expect(isPrimaryNavRoute("/chat")).toBe(true);
    expect(isPrimaryNavRoute("/chat/")).toBe(true);
    expect(isPrimaryNavRoute("/gigalearn")).toBe(true);
    expect(isPrimaryNavRoute("/gigalearn/academy")).toBe(true);
    expect(isPrimaryNavRoute("/gigalearn/exam")).toBe(true);
    expect(isPrimaryNavRoute("/gigasocial/")).toBe(true);
    expect(isPrimaryNavRoute("/gigasocial/profile")).toBe(true);
    expect(isPrimaryNavRoute("/marketplace")).toBe(true);
    expect(isPrimaryNavRoute("/marketplace/item/abc")).toBe(true);
  });

  it("does not treat retired create products as primary nav routes", () => {
    expect(isPrimaryNavRoute("/media")).toBe(false);
    expect(isPrimaryNavRoute("/gigaedit")).toBe(false);
    expect(isPrimaryNavRoute("/video")).toBe(false);
    expect(isPrimaryNavRoute("/ai-studio")).toBe(false);
    expect(isRetiredProductPath("/media")).toBe(true);
    expect(isRetiredProductPath("/gigaedit/?tab=video")).toBe(true);
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
    expect(resolvePrimaryNavTab("/gigalearn/")).toBe("learn");
    expect(resolvePrimaryNavTab("/gigalearn/academy")).toBe("learn");
    expect(resolvePrimaryNavTab("/gigalearn/exam")).toBe("practice");
    expect(resolvePrimaryNavTab("/gigasocial/?tab=feed")).toBe("social");
    expect(resolvePrimaryNavTab("/marketplace")).toBe("market");
  });

  it("shows desktop rail for learn/practice/social/market but not chat", () => {
    expect(shouldShowDesktopRail("/gigalearn")).toBe(true);
    expect(shouldShowDesktopRail("/gigalearn/exam")).toBe(true);
    expect(shouldShowDesktopRail("/gigasocial/")).toBe(true);
    expect(shouldShowDesktopRail("/marketplace")).toBe(true);
    expect(shouldShowDesktopRail("/chat")).toBe(false);
    expect(shouldShowDesktopRail("/media")).toBe(false);
  });

  it("uses Practice tab for Exam Practice (no Create tab)", () => {
    expect(PRIMARY_NAV_TABS.map((t) => t.id)).toEqual([
      "home",
      "learn",
      "practice",
      "social",
      "market",
    ]);
    const practice = PRIMARY_NAV_TABS.find((tab) => tab.id === "practice");
    expect(practice?.href).toContain("/gigalearn/exam");
    expect(PRIMARY_NAV_TABS.some((tab) => (tab.id as string) === "create")).toBe(false);
  });

  it("keeps navigation hidden on auth and payment routes", () => {
    expect(isPrimaryNavRoute("/chat/login")).toBe(false);
    expect(isPrimaryNavRoute("/chat/share/token123")).toBe(false);
    expect(isPrimaryNavRoute("/payment/success")).toBe(false);
    expect(isPrimaryNavRoute("/payment/failed")).toBe(false);
    expect(resolvePrimaryNavTab("/chat/login")).toBeNull();
  });
});
