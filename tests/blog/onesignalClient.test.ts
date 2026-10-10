/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Avoid happy-dom CDN fetch: mark the SDK script as already loaded. */
function seedLoadedSdkScript(): void {
  const script = document.createElement("script");
  script.dataset.giga3Onesignal = "1";
  script.dataset.loaded = "1";
  document.head.appendChild(script);
}

async function flushOneSignalInit(mockOneSignal: {
  init: ReturnType<typeof vi.fn>;
  Notifications?: { requestPermission?: ReturnType<typeof vi.fn> };
  User?: { PushSubscription?: { optIn?: ReturnType<typeof vi.fn>; optOut?: ReturnType<typeof vi.fn> } };
}) {
  await vi.waitFor(() => {
    expect((window.OneSignalDeferred?.length ?? 0) > 0).toBe(true);
  });
  const cb = window.OneSignalDeferred!.shift()!;
  await cb(mockOneSignal as never);
}

describe("onesignalClient", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    localStorage.clear();
    document.head.innerHTML = "";
    // @ts-expect-error test cleanup
    delete window.OneSignalDeferred;
    // @ts-expect-error test cleanup
    delete window.OneSignal;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("reports disabled when feature flag is off and does not load the SDK", async () => {
    vi.stubEnv("NEXT_PUBLIC_GIGA3_BLOG_PUSH_ENABLED", "");
    vi.stubEnv("NEXT_PUBLIC_ONESIGNAL_APP_ID", "");
    const { subscribeBlogPush, ensureBlogPushInitialized, __resetBlogPushClientForTests } =
      await import("../../web/lib/blog/onesignalClient");
    __resetBlogPushClientForTests();
    const result = await subscribeBlogPush();
    expect(result.ok).toBe(false);
    expect(result.error).toBe("disabled");
    expect(await ensureBlogPushInitialized()).toBeNull();
    expect(document.querySelector("script[data-giga3-onesignal]")).toBeNull();
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
    Object.defineProperty(window, "PushManager", { value: original, configurable: true });
  });

  it("isBlogPushOptedIn reads the marker only and never loads the SDK", async () => {
    vi.stubEnv("NEXT_PUBLIC_GIGA3_BLOG_PUSH_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_ONESIGNAL_APP_ID", "a1b2c3d4-e5f6-4789-a012-3456789abcde");
    const { isBlogPushOptedIn, __resetBlogPushClientForTests } = await import(
      "../../web/lib/blog/onesignalClient"
    );
    const { BLOG_PUSH_OPTED_IN_KEY } = await import("../../web/lib/blog/blogPushConfig");
    __resetBlogPushClientForTests();
    expect(isBlogPushOptedIn()).toBe(false);
    localStorage.setItem(BLOG_PUSH_OPTED_IN_KEY, "1");
    expect(isBlogPushOptedIn()).toBe(true);
    expect(document.querySelector("script[data-giga3-onesignal]")).toBeNull();
  });

  it("skips native permission request when permission is already granted", async () => {
    vi.stubEnv("NEXT_PUBLIC_GIGA3_BLOG_PUSH_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_ONESIGNAL_APP_ID", "a1b2c3d4-e5f6-4789-a012-3456789abcde");

    Object.defineProperty(window, "PushManager", {
      value: function PushManager() {},
      configurable: true,
    });
    const nativeRequest = vi.fn(async () => "granted");
    Object.defineProperty(window, "Notification", {
      value: { permission: "granted", requestPermission: nativeRequest },
      configurable: true,
    });
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: vi.fn() },
      configurable: true,
    });

    const requestPermission = vi.fn(async () => "granted");
    const optIn = vi.fn(async () => undefined);
    const init = vi.fn(async () => undefined);

    const { subscribeBlogPush, __resetBlogPushClientForTests } = await import(
      "../../web/lib/blog/onesignalClient"
    );
    __resetBlogPushClientForTests();
    seedLoadedSdkScript();

    const subscribePromise = subscribeBlogPush();
    await flushOneSignalInit({
      init,
      Notifications: { requestPermission },
      User: { PushSubscription: { optIn } },
    });

    const result = await subscribePromise;
    expect(result.ok).toBe(true);
    expect(init).toHaveBeenCalledTimes(1);
    expect(optIn).toHaveBeenCalledTimes(1);
    expect(requestPermission).not.toHaveBeenCalled();
    expect(nativeRequest).not.toHaveBeenCalled();
  });

  it("requests permission only when permission is default", async () => {
    vi.stubEnv("NEXT_PUBLIC_GIGA3_BLOG_PUSH_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_ONESIGNAL_APP_ID", "a1b2c3d4-e5f6-4789-a012-3456789abcde");

    Object.defineProperty(window, "PushManager", {
      value: function PushManager() {},
      configurable: true,
    });
    Object.defineProperty(window, "Notification", {
      value: { permission: "default", requestPermission: vi.fn(async () => "granted") },
      configurable: true,
    });
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: vi.fn() },
      configurable: true,
    });

    const requestPermission = vi.fn(async () => {
      Object.defineProperty(window.Notification, "permission", {
        value: "granted",
        configurable: true,
      });
      return "granted";
    });
    const optIn = vi.fn(async () => undefined);
    const init = vi.fn(async () => undefined);

    const { subscribeBlogPush, __resetBlogPushClientForTests } = await import(
      "../../web/lib/blog/onesignalClient"
    );
    __resetBlogPushClientForTests();
    seedLoadedSdkScript();

    const subscribePromise = subscribeBlogPush();
    await flushOneSignalInit({
      init,
      Notifications: { requestPermission },
      User: { PushSubscription: { optIn } },
    });

    const result = await subscribePromise;
    expect(result.ok).toBe(true);
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(window.Notification.requestPermission).not.toHaveBeenCalled();
  });
});
