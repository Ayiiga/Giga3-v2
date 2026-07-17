/** GigaSocial fan branding — display labels only (internal APIs keep follow/follower ids). */

export const FAN_LABELS = {
  becomeAFan: "Become a Fan",
  fanOf: "Fan Of",
  supporting: "Supporting",
  fanCount: "Fan Count",
  fans: "Fans",
  becameYourFan: "became your fan",
  fansOnly: "Fans only",
  unfan: "Stop Supporting",
  mutualFans: "Mutual Fans",
  followingLabel: "Following",
} as const;

export const FOLLOW_LABELS = {
  follow: "Follow",
  following: "Following",
  unfollow: "Unfollow",
  followers: "Followers",
  followingCount: "Following",
} as const;

/** Map legacy follow copy to fan branding for notifications and UI. */
export function localizeFanText(text: string): string {
  return text
    .replace(/\bfollowed you\b/gi, FAN_LABELS.becameYourFan)
    .replace(/\bfollower count\b/gi, FAN_LABELS.fanCount)
    .replace(/\bfollowers\b/gi, FAN_LABELS.fans)
    .replace(/\bfollower\b/gi, "Fan")
    .replace(/\bfollowing\b/gi, FAN_LABELS.supporting)
    .replace(/\bfollow\b/gi, "Fan");
}

export function fanNotificationMessage(type: string, message: string): string {
  if (type === "follow") {
    if (/became your fan/i.test(message)) return message;
    return localizeFanText(message || FAN_LABELS.becameYourFan);
  }
  return localizeFanText(message);
}

export function visibilityLabel(visibility?: "public" | "followers"): string {
  if (visibility === "followers") return FAN_LABELS.fansOnly;
  return "Public";
}
