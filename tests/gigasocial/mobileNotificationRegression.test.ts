import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { notificationDisplayMessage, notificationDestination } from "../../web/lib/gigasocial/notificationGroups";
import type { SocialNotification } from "../../web/lib/gigasocial/types";

const base: SocialNotification = {
  _id: "notification-one", type: "creator", message: "Ada published a new post",
  read: false, createdAt: 1, actor: { displayName: "Ada", handle: "ada" }
};

describe("mobile activity regression", () => {
  it("renders a single actor name for legacy creator messages", () => {
    expect(notificationDisplayMessage(base)).toBe("Ada published a new post.");
    expect(notificationDisplayMessage({ ...base, message: "oldhandle published a new post" })).toBe("Ada published a new post.");
    expect(notificationDisplayMessage({ ...base, type: "like", message: "liked your post" })).toBe("Ada liked your post");
    expect(notificationDisplayMessage({ ...base, type: "like", message: "Ada liked your post" })).toBe("Ada liked your post");
    expect(notificationDisplayMessage({ ...base, type: "follow", message: "followed you" })).toBe("Ada became your fan.");
  });
  it("does not prepend a fake actor to a system message", () => {
    expect(notificationDisplayMessage({ ...base, actor: null, message: "Your application is pending" })).toBe("Your application is pending");
  });
  it("uses encoded runtime destinations rather than requiring pre-rendered posts", () => {
    expect(notificationDestination({ ...base, postId: "new/post" })).toEqual({ href: "/gigasocial/post/?activity=1&id=new%2Fpost", label: "View post" });
    expect(notificationDestination({ ...base, type: "follow" })).toEqual({ href: "/gigasocial/profile/?activity=1&handle=ada", label: "View profile" });
    expect(notificationDestination({ ...base, communitySlug: "science club" })).toEqual({ href: "/gigasocial/?community=science%20club", label: "Open community" });
    expect(notificationDestination({ ...base, actor: null })).toBeNull();
  });
  it("requires recipient ownership for single notification read updates", () => {
    const src = readFileSync("convex/gigaSocial.ts", "utf8");
    expect(src).toContain('notificationId: v.optional(v.id("socialNotifications"))');
    expect(src).toContain("notification.recipientId !== userId");
  });
  it("defines the masked national ID without returning raw ID fields", () => {
    const src = readFileSync("convex/creatorProfiles.ts", "utf8");
    const profile = src.slice(src.indexOf("export const getMyProfile"), src.indexOf("export const getByHandle"));
    expect(profile).toContain("const nationalIdNumber = profile.nationalIdNumber;");
    expect(profile).toContain("delete safeProfile.nationalIdNumber;");
    expect(profile).toContain("delete safeProfile.idDocumentStorageId;");
    expect(profile).toContain("nationalIdNumber.slice(-4)");
  });
});
