/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    cleanup();
    vi.clearAllMocks();
  });

  it("renders nothing when the feature is disabled and does not init OneSignal", async () => {
    vi.mocked(config.isBlogPushEnabled).mockReturnValue(false);
    const { container } = render(<BlogPushSubscribe />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
    expect(client.ensureBlogPushInitialized).not.toHaveBeenCalled();
    expect(client.subscribeBlogPush).not.toHaveBeenCalled();
  });

  it("does not initialize OneSignal on mount when permission is already granted", async () => {
    vi.mocked(client.getBlogPushPermission).mockReturnValue("granted");
    render(<BlogPushSubscribe />);
    expect(
      await screen.findByRole("heading", { name: /Get notified about new Giga3 AI articles/i })
    ).toBeTruthy();
    expect(client.ensureBlogPushInitialized).not.toHaveBeenCalled();
    expect(client.subscribeBlogPush).not.toHaveBeenCalled();
    expect(document.querySelector("script[data-giga3-onesignal]")).toBeNull();
  });

  it("shows subscribed from the blog opted-in marker without initializing OneSignal", async () => {
    vi.mocked(client.getBlogPushPermission).mockReturnValue("granted");
    localStorage.setItem(config.BLOG_PUSH_OPTED_IN_KEY, "1");
    render(<BlogPushSubscribe />);
    expect(await screen.findByRole("heading", { name: /Blog notifications on/i })).toBeTruthy();
    expect(client.ensureBlogPushInitialized).not.toHaveBeenCalled();
    expect(client.subscribeBlogPush).not.toHaveBeenCalled();
  });

  it("shows the soft prompt and dismisses without requesting permission", async () => {
    render(<BlogPushSubscribe />);
    expect(
      await screen.findByRole("heading", { name: /Get notified about new Giga3 AI articles/i })
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Not now/i }));
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /Get notified/i })).toBeNull();
    });
    expect(client.subscribeBlogPush).not.toHaveBeenCalled();
    expect(client.ensureBlogPushInitialized).not.toHaveBeenCalled();
    expect(localStorage.getItem(config.BLOG_PUSH_DISMISS_KEY)).toBe("1");
  });

  it("does not re-prompt after mute", async () => {
    localStorage.setItem(config.BLOG_PUSH_MUTE_KEY, "1");
    const { container } = render(<BlogPushSubscribe />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
    expect(client.ensureBlogPushInitialized).not.toHaveBeenCalled();
  });

  it("explains unsupported browsers", async () => {
    vi.mocked(client.isBlogPushSupported).mockReturnValue(false);
    render(<BlogPushSubscribe />);
    expect(await screen.findByText(/not available in this browser/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Notify me/i })).toBeNull();
    expect(client.ensureBlogPushInitialized).not.toHaveBeenCalled();
  });

  it("explains denied permission without asking again", async () => {
    vi.mocked(client.getBlogPushPermission).mockReturnValue("denied");
    render(<BlogPushSubscribe />);
    expect(await screen.findByText(/Notifications are blocked/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Notify me/i })).toBeNull();
    expect(client.subscribeBlogPush).not.toHaveBeenCalled();
    expect(client.ensureBlogPushInitialized).not.toHaveBeenCalled();
  });

  it("subscribes only after Notify me and sets the blog opted-in marker", async () => {
    render(<BlogPushSubscribe />);
    fireEvent.click(await screen.findByRole("button", { name: /Notify me/i }));
    await waitFor(() => {
      expect(client.subscribeBlogPush).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByRole("heading", { name: /Blog notifications on/i })).toBeTruthy();
    expect(localStorage.getItem(config.BLOG_PUSH_OPTED_IN_KEY)).toBe("1");
  });

  it("with permission already granted, Notify me still runs subscribe without mount-time init", async () => {
    vi.mocked(client.getBlogPushPermission).mockReturnValue("granted");
    render(<BlogPushSubscribe />);
    expect(client.ensureBlogPushInitialized).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: /Notify me/i }));
    await waitFor(() => {
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
    render(<BlogPushSubscribe />);
    fireEvent.click(await screen.findByRole("button", { name: /Notify me/i }));
    expect(await screen.findByText(/Could not subscribe right now/i)).toBeTruthy();
    expect(localStorage.getItem(config.BLOG_PUSH_OPTED_IN_KEY)).toBeNull();
  });

  it("allows unsubscribe when the blog marker is set and clears the marker", async () => {
    localStorage.setItem(config.BLOG_PUSH_OPTED_IN_KEY, "1");
    vi.mocked(client.getBlogPushPermission).mockReturnValue("granted");
    render(<BlogPushSubscribe />);
    fireEvent.click(await screen.findByRole("button", { name: /Unsubscribe/i }));
    await waitFor(() => {
      expect(client.unsubscribeBlogPush).toHaveBeenCalledTimes(1);
    });
    expect(localStorage.getItem(config.BLOG_PUSH_OPTED_IN_KEY)).toBeNull();
    expect(await screen.findByRole("button", { name: /Notify me/i })).toBeTruthy();
  });
});
