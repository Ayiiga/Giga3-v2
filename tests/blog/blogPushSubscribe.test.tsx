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

vi.mock("../../web/lib/blog/onesignalClient", () => ({
  getBlogPushPermission: vi.fn(() => "default"),
  isBlogPushSupported: vi.fn(() => true),
  isBlogPushOptedIn: vi.fn(async () => false),
  subscribeBlogPush: vi.fn(async () => ({ ok: true, permission: "granted" as const })),
  unsubscribeBlogPush: vi.fn(async () => ({ ok: true })),
}));

describe("BlogPushSubscribe", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(config.isBlogPushEnabled).mockReturnValue(true);
    vi.mocked(client.isBlogPushSupported).mockReturnValue(true);
    vi.mocked(client.getBlogPushPermission).mockReturnValue("default");
    vi.mocked(client.isBlogPushOptedIn).mockResolvedValue(false);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders nothing when the feature is disabled", async () => {
    vi.mocked(config.isBlogPushEnabled).mockReturnValue(false);
    const { container } = render(<BlogPushSubscribe />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
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
    expect(localStorage.getItem(config.BLOG_PUSH_DISMISS_KEY)).toBe("1");
  });

  it("does not re-prompt after mute", async () => {
    localStorage.setItem(config.BLOG_PUSH_MUTE_KEY, "1");
    const { container } = render(<BlogPushSubscribe />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("explains unsupported browsers", async () => {
    vi.mocked(client.isBlogPushSupported).mockReturnValue(false);
    render(<BlogPushSubscribe />);
    expect(await screen.findByText(/not available in this browser/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Notify me/i })).toBeNull();
  });

  it("explains denied permission without asking again", async () => {
    vi.mocked(client.getBlogPushPermission).mockReturnValue("denied");
    render(<BlogPushSubscribe />);
    expect(await screen.findByText(/Notifications are blocked/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Notify me/i })).toBeNull();
  });

  it("subscribes only after Notify me", async () => {
    render(<BlogPushSubscribe />);
    fireEvent.click(await screen.findByRole("button", { name: /Notify me/i }));
    await waitFor(() => {
      expect(client.subscribeBlogPush).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByRole("heading", { name: /Blog notifications on/i })).toBeTruthy();
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
  });

  it("allows unsubscribe when already opted in", async () => {
    vi.mocked(client.getBlogPushPermission).mockReturnValue("granted");
    vi.mocked(client.isBlogPushOptedIn).mockResolvedValue(true);
    render(<BlogPushSubscribe />);
    fireEvent.click(await screen.findByRole("button", { name: /Unsubscribe/i }));
    await waitFor(() => {
      expect(client.unsubscribeBlogPush).toHaveBeenCalledTimes(1);
    });
  });
});
