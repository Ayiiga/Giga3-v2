/**
 * @vitest-environment happy-dom
 *
 * Uses react-dom/client createRoot (same pattern as other web/*.test.tsx suites).
 * Avoid @testing-library/react here: on CI, root npm ci does not install `react`
 * at the repo root, and RTL's CJS require("react") fails before Vite aliases apply.
 */
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BlogPushSubscribe } from "../../web/components/blog/BlogPushSubscribe";
import * as config from "../../web/lib/blog/blogPushConfig";
import * as client from "../../web/lib/blog/onesignalClient";

vi.mock("../../web/lib/blog/blogPushConfig", async () => {
  const actual = await vi.importActual<typeof config>("../../web/lib/blog/blogPushConfig");
  return {
    ...actual,
    isBlogPushEnabled: vi.fn(() => true),
  };
});

vi.mock("../../web/lib/blog/onesignalClient", async () => {
  const actual = await vi.importActual<typeof client>("../../web/lib/blog/onesignalClient");
  return {
    ...actual,
    getBlogPushPermission: vi.fn(() => "default"),
    isBlogPushSupported: vi.fn(() => true),
    subscribeBlogPush: vi.fn(async () => ({ ok: true, permission: "granted" as const })),
    unsubscribeBlogPush: vi.fn(async () => ({ ok: true })),
    ensureBlogPushInitialized: vi.fn(async () => null),
  };
});

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function mount() {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root?.render(createElement(BlogPushSubscribe));
  });
  return host;
}

function clickButton(label: RegExp) {
  const button = Array.from(host!.querySelectorAll("button")).find((el) =>
    label.test(el.textContent ?? "")
  );
  expect(button, `button matching ${label}`).toBeTruthy();
  act(() => {
    button!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("BlogPushSubscribe", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(config.isBlogPushEnabled).mockReturnValue(true);
    vi.mocked(client.isBlogPushSupported).mockReturnValue(true);
    vi.mocked(client.getBlogPushPermission).mockReturnValue("default");
    vi.mocked(client.subscribeBlogPush).mockResolvedValue({ ok: true, permission: "granted" });
    vi.mocked(client.unsubscribeBlogPush).mockResolvedValue({ ok: true });
    vi.mocked(client.ensureBlogPushInitialized).mockClear();
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    host?.remove();
    host = null;
    vi.clearAllMocks();
  });

  it("renders nothing when the feature is disabled and does not init OneSignal", async () => {
    vi.mocked(config.isBlogPushEnabled).mockReturnValue(false);
    mount();
    await vi.waitFor(() => {
      expect(host!.childElementCount).toBe(0);
    });
    expect(client.ensureBlogPushInitialized).not.toHaveBeenCalled();
    expect(client.subscribeBlogPush).not.toHaveBeenCalled();
  });

  it("does not initialize OneSignal on mount when permission is already granted", async () => {
    vi.mocked(client.getBlogPushPermission).mockReturnValue("granted");
    mount();
    await vi.waitFor(() => {
      expect(host!.textContent).toMatch(/Get notified about new Giga3 AI articles/i);
    });
    expect(client.ensureBlogPushInitialized).not.toHaveBeenCalled();
    expect(client.subscribeBlogPush).not.toHaveBeenCalled();
    expect(document.querySelector("script[data-giga3-onesignal]")).toBeNull();
  });

  it("shows subscribed from the blog opted-in marker without initializing OneSignal", async () => {
    vi.mocked(client.getBlogPushPermission).mockReturnValue("granted");
    localStorage.setItem(config.BLOG_PUSH_OPTED_IN_KEY, "1");
    mount();
    await vi.waitFor(() => {
      expect(host!.textContent).toMatch(/Blog notifications on/i);
    });
    expect(client.ensureBlogPushInitialized).not.toHaveBeenCalled();
    expect(client.subscribeBlogPush).not.toHaveBeenCalled();
  });

  it("shows the soft prompt and dismisses without requesting permission", async () => {
    mount();
    await vi.waitFor(() => {
      expect(host!.textContent).toMatch(/Get notified about new Giga3 AI articles/i);
    });
    clickButton(/Not now/i);
    await vi.waitFor(() => {
      expect(host!.textContent ?? "").not.toMatch(/Get notified/i);
      expect(host!.childElementCount).toBe(0);
    });
    expect(client.subscribeBlogPush).not.toHaveBeenCalled();
    expect(client.ensureBlogPushInitialized).not.toHaveBeenCalled();
    expect(localStorage.getItem(config.BLOG_PUSH_DISMISS_KEY)).toBe("1");
  });

  it("does not re-prompt after mute", async () => {
    localStorage.setItem(config.BLOG_PUSH_MUTE_KEY, "1");
    mount();
    await vi.waitFor(() => {
      expect(host!.childElementCount).toBe(0);
    });
    expect(client.ensureBlogPushInitialized).not.toHaveBeenCalled();
  });

  it("explains unsupported browsers", async () => {
    vi.mocked(client.isBlogPushSupported).mockReturnValue(false);
    mount();
    await vi.waitFor(() => {
      expect(host!.textContent).toMatch(/not available in this browser/i);
    });
    expect(Array.from(host!.querySelectorAll("button")).some((b) => /Notify me/i.test(b.textContent ?? ""))).toBe(
      false
    );
    expect(client.ensureBlogPushInitialized).not.toHaveBeenCalled();
  });

  it("explains denied permission without asking again", async () => {
    vi.mocked(client.getBlogPushPermission).mockReturnValue("denied");
    mount();
    await vi.waitFor(() => {
      expect(host!.textContent).toMatch(/Notifications are blocked/i);
    });
    expect(Array.from(host!.querySelectorAll("button")).some((b) => /Notify me/i.test(b.textContent ?? ""))).toBe(
      false
    );
    expect(client.subscribeBlogPush).not.toHaveBeenCalled();
    expect(client.ensureBlogPushInitialized).not.toHaveBeenCalled();
  });

  it("subscribes only after Notify me and sets the blog opted-in marker", async () => {
    mount();
    await vi.waitFor(() => {
      expect(host!.textContent).toMatch(/Notify me/i);
    });
    clickButton(/Notify me/i);
    await vi.waitFor(() => {
      expect(client.subscribeBlogPush).toHaveBeenCalledTimes(1);
    });
    await vi.waitFor(() => {
      expect(host!.textContent).toMatch(/Blog notifications on/i);
    });
    expect(localStorage.getItem(config.BLOG_PUSH_OPTED_IN_KEY)).toBe("1");
  });

  it("with permission already granted, Notify me still runs subscribe without mount-time init", async () => {
    vi.mocked(client.getBlogPushPermission).mockReturnValue("granted");
    mount();
    expect(client.ensureBlogPushInitialized).not.toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(host!.textContent).toMatch(/Notify me/i);
    });
    clickButton(/Notify me/i);
    await vi.waitFor(() => {
      expect(client.subscribeBlogPush).toHaveBeenCalledTimes(1);
    });
    expect(localStorage.getItem(config.BLOG_PUSH_OPTED_IN_KEY)).toBe("1");
  });

  it("handles subscribe errors without crashing", async () => {
    vi.mocked(client.subscribeBlogPush).mockResolvedValue({
      ok: false,
      permission: "default",
      error: "subscribe_failed",
    });
    mount();
    await vi.waitFor(() => {
      expect(host!.textContent).toMatch(/Notify me/i);
    });
    clickButton(/Notify me/i);
    await vi.waitFor(() => {
      expect(host!.textContent).toMatch(/Could not subscribe right now/i);
    });
    expect(localStorage.getItem(config.BLOG_PUSH_OPTED_IN_KEY)).toBeNull();
  });

  it("allows unsubscribe when the blog marker is set and clears the marker", async () => {
    localStorage.setItem(config.BLOG_PUSH_OPTED_IN_KEY, "1");
    vi.mocked(client.getBlogPushPermission).mockReturnValue("granted");
    mount();
    await vi.waitFor(() => {
      expect(host!.textContent).toMatch(/Unsubscribe/i);
    });
    clickButton(/Unsubscribe/i);
    await vi.waitFor(() => {
      expect(client.unsubscribeBlogPush).toHaveBeenCalledTimes(1);
    });
    expect(localStorage.getItem(config.BLOG_PUSH_OPTED_IN_KEY)).toBeNull();
    await vi.waitFor(() => {
      expect(host!.textContent).toMatch(/Notify me/i);
    });
  });
});
