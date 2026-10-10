import { describe, expect, it } from "vitest";
import {
  BLOG_PUSH_SW_PATH,
  BLOG_PUSH_SW_SCOPE,
  buildBlogArticleNotificationUrl,
  getOneSignalAppId,
  isApprovedBlogNotificationUrl,
  isBlogPushEnabled,
} from "../../web/lib/blog/blogPushConfig";

describe("blogPushConfig", () => {
  it("stays disabled without flag or valid App ID", () => {
    expect(isBlogPushEnabled({ enabled: undefined, appId: undefined })).toBe(false);
    expect(isBlogPushEnabled({ enabled: "true", appId: "" })).toBe(false);
    expect(isBlogPushEnabled({ enabled: "true", appId: "not-a-uuid" })).toBe(false);
    expect(isBlogPushEnabled({ enabled: "false", appId: "11111111-1111-4111-8111-111111111111" })).toBe(
      false
    );
  });

  it("enables only with explicit flag and UUID App ID", () => {
    const appId = "a1b2c3d4-e5f6-4789-a012-3456789abcde";
    expect(isBlogPushEnabled({ enabled: "true", appId })).toBe(true);
    expect(isBlogPushEnabled({ enabled: "1", appId })).toBe(true);
  });

  it("getOneSignalAppId returns null when disabled in process env defaults", () => {
    // Without build env, feature is off — never invent an ID.
    expect(getOneSignalAppId(undefined)).toBeNull();
  });

  it("keeps OneSignal worker on a non-root subdirectory scope", () => {
    expect(BLOG_PUSH_SW_PATH).toBe("push/onesignal/OneSignalSDKWorker.js");
    expect(BLOG_PUSH_SW_SCOPE).toBe("/push/onesignal/");
    expect(BLOG_PUSH_SW_SCOPE).not.toBe("/");
  });

  it("approves only https Giga3 blog URLs", () => {
    expect(isApprovedBlogNotificationUrl("https://www.giga3ai.com/blog/foo/")).toBe(true);
    expect(isApprovedBlogNotificationUrl("https://giga3ai.com/blog/foo/")).toBe(true);
    expect(isApprovedBlogNotificationUrl("https://evil.example/blog/foo/")).toBe(false);
    expect(isApprovedBlogNotificationUrl("http://www.giga3ai.com/blog/foo/")).toBe(false);
    expect(isApprovedBlogNotificationUrl("https://www.giga3ai.com/chat/")).toBe(false);
  });

  it("builds canonical trailing-slash article URLs", () => {
    expect(buildBlogArticleNotificationUrl("make-money-with-ai-ghana-2026")).toBe(
      "https://www.giga3ai.com/blog/make-money-with-ai-ghana-2026/"
    );
  });
});
