/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("onesignalClient", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    document.head.innerHTML = "";
    // @ts-expect-error test cleanup
    delete window.OneSignalDeferred;
    // @ts-expect-error test cleanup
    delete window.OneSignal;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports disabled when feature flag is off", async () => {
    vi.stubEnv("NEXT_PUBLIC_GIGA3_BLOG_PUSH_ENABLED", "");
    vi.stubEnv("NEXT_PUBLIC_ONESIGNAL_APP_ID", "");
    const { subscribeBlogPush, ensureBlogPushInitialized, __resetBlogPushClientForTests } =
      await import("../../web/lib/blog/onesignalClient");
    __resetBlogPushClientForTests();
    const result = await subscribeBlogPush();
    expect(result.ok).toBe(false);
    expect(result.error).toBe("disabled");
    expect(await ensureBlogPushInitialized()).toBeNull();
  });

  it("reports unsupported when PushManager is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_GIGA3_BLOG_PUSH_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_ONESIGNAL_APP_ID", "a1b2c3d4-e5f6-4789-a012-3456789abcde");
    const original = window.PushManager;
    // @ts-expect-error simulate unsupported
    delete window.PushManager;
    const { subscribeBlogPush, __resetBlogPushClientForTests } = await import(
      "../../web/lib/blog/onesignalClient"
    );
    __resetBlogPushClientForTests();
    const result = await subscribeBlogPush();
    expect(result.ok).toBe(false);
    expect(result.permission).toBe("unsupported");
    // restore
    Object.defineProperty(window, "PushManager", { value: original, configurable: true });
  });
});
