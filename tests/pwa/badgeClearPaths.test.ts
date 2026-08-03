import { describe, expect, it } from "vitest";
import { shouldClearAppBadgeForPath } from "../../web/lib/pwa/badgeClearPaths";

describe("shouldClearAppBadgeForPath", () => {
  it("clears on chat, gigasocial, media, gigalearn, home, and workspace", () => {
    expect(shouldClearAppBadgeForPath("/chat")).toBe(true);
    expect(shouldClearAppBadgeForPath("/chat/")).toBe(true);
    expect(shouldClearAppBadgeForPath("/gigasocial/?tab=notifications")).toBe(true);
    expect(shouldClearAppBadgeForPath("/media")).toBe(true);
    expect(shouldClearAppBadgeForPath("/gigalearn")).toBe(true);
    expect(shouldClearAppBadgeForPath("/home")).toBe(true);
    expect(shouldClearAppBadgeForPath("/workspace")).toBe(true);
  });

  it("does not clear on marketing or auth pages", () => {
    expect(shouldClearAppBadgeForPath("/")).toBe(false);
    expect(shouldClearAppBadgeForPath("/pricing")).toBe(false);
    expect(shouldClearAppBadgeForPath("/chat/login")).toBe(false);
    expect(shouldClearAppBadgeForPath(null)).toBe(false);
  });
});
