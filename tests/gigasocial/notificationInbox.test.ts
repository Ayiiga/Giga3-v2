import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  categorizeNotification,
  filterNotificationsByPrefs,
  groupNotifications,
} from "../../web/lib/gigasocial/notificationGroups";
import {
  clampNotificationLimit,
  formatUnreadBadge,
  formatUnreadCountLabel,
  notificationEmptyCopy,
  notificationHref,
  resolveNotificationEmptyReason,
} from "../../web/lib/gigasocial/notificationInbox";
import { GIGASOCIAL_FEATURE_DEFAULTS } from "../../web/lib/gigasocial/featureFlags";
import type { SocialNotification } from "../../web/lib/gigasocial/types";

function note(
  partial: Partial<SocialNotification> & Pick<SocialNotification, "type" | "message">
): SocialNotification {
  return {
    _id: partial._id ?? "n1",
    type: partial.type,
    message: partial.message,
    read: partial.read ?? false,
    createdAt: partial.createdAt ?? 1,
    postId: partial.postId,
    communitySlug: partial.communitySlug,
    actor: partial.actor ?? null,
  };
}

describe("notification inbox helpers", () => {
  it("formats unread labels and badges", () => {
    expect(formatUnreadCountLabel(0)).toBe("You're all caught up.");
    expect(formatUnreadCountLabel(1)).toBe("1 unread notification");
    expect(formatUnreadCountLabel(3)).toBe("3 unread notifications");
    expect(formatUnreadBadge(0)).toBe("");
    expect(formatUnreadBadge(9)).toBe("9");
    expect(formatUnreadBadge(12)).toBe("9+");
  });

  it("resolves empty reasons for loading, none, and filtered", () => {
    expect(
      resolveNotificationEmptyReason({
        loading: true,
        signedIn: true,
        totalCount: 0,
        visibleCount: 0,
      })
    ).toBe("loading");
    expect(
      resolveNotificationEmptyReason({
        loading: false,
        signedIn: true,
        totalCount: 0,
        visibleCount: 0,
      })
    ).toBe("none");
    expect(
      resolveNotificationEmptyReason({
        loading: false,
        signedIn: true,
        totalCount: 4,
        visibleCount: 0,
      })
    ).toBe("filtered");
    expect(notificationEmptyCopy("filtered").title).toMatch(/filter/i);
    expect(notificationEmptyCopy("none").description).toMatch(/Direct messages/i);
  });

  it("builds deep links for posts and communities", () => {
    expect(notificationHref(note({ type: "like", message: "liked", postId: "abc" }))).toBe(
      "/gigasocial/post/abc/"
    );
    expect(
      notificationHref(note({ type: "community", message: "joined", communitySlug: "education" }))
    ).toBe("/gigasocial/?section=communities&community=education");
    expect(notificationHref(note({ type: "creator", message: "hi" }))).toBeNull();
  });

  it("clamps notification list limits like the Convex query", () => {
    expect(clampNotificationLimit(undefined)).toBe(30);
    expect(clampNotificationLimit(40)).toBe(40);
    expect(clampNotificationLimit(999)).toBe(60);
    expect(clampNotificationLimit(0)).toBe(1);
  });
});

describe("notification grouping prefs", () => {
  it("categorizes likes/comments as creator and mentions as messages", () => {
    expect(categorizeNotification(note({ type: "like", message: "liked your post" }))).toBe(
      "creator"
    );
    expect(categorizeNotification(note({ type: "mention", message: "mentioned you" }))).toBe(
      "messages"
    );
  });

  it("filters disabled categories without dropping others", () => {
    const items = [
      note({ _id: "1", type: "like", message: "liked" }),
      note({ _id: "2", type: "community", message: "welcome", communitySlug: "edu" }),
    ];
    const filtered = filterNotificationsByPrefs(items, { creator: false });
    expect(filtered.map((n) => n._id)).toEqual(["2"]);
    expect(groupNotifications(items).some((g) => g.category === "creator")).toBe(true);
  });
});

describe("notifications API preservation + DM flag", () => {
  it("keeps listNotifications / unread / markRead in gigaSocial.ts", () => {
    const src = readFileSync(resolve(__dirname, "../../convex/gigaSocial.ts"), "utf8");
    expect(src).toContain("export const listNotifications = query");
    expect(src).toContain("export const getNotificationUnreadCount = query");
    expect(src).toContain("export const markNotificationsRead = mutation");
    expect(src).toContain('withIndex("by_recipient_created"');
    expect(src).toContain('withIndex("by_recipient_read"');
  });

  it("keeps direct messages disabled by default", () => {
    expect(GIGASOCIAL_FEATURE_DEFAULTS.enableDirectMessages).toBe(false);
  });

  it("panel clarifies activity inbox vs DMs", () => {
    const panel = readFileSync(
      resolve(__dirname, "../../web/components/gigasocial/GigaSocialNotificationsPanel.tsx"),
      "utf8"
    );
    expect(panel).toContain("Activity inbox");
    expect(panel).toContain("Direct messages are not available yet");
    expect(panel).toContain("notificationHref");
    expect(panel).toContain("formatUnreadCountLabel");
  });
});
