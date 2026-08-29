export const FREE_MAX_VIDEO_DURATION_SEC = 20;
export const PREMIUM_MAX_VIDEO_DURATION_SEC = 185;

export function maxVideoDurationSecForPlan(args: {
  subscriptionPlan?: string | null;
  subscriptionExpiresAt?: number | null;
  now?: number;
}): number {
  const activePremium =
    args.subscriptionPlan === "premium" &&
    typeof args.subscriptionExpiresAt === "number" &&
    args.subscriptionExpiresAt > (args.now ?? Date.now());
  return activePremium ? PREMIUM_MAX_VIDEO_DURATION_SEC : FREE_MAX_VIDEO_DURATION_SEC;
}

export function assertVideoDurationWithinPlan(args: {
  durationSec: number;
  subscriptionPlan?: string | null;
  subscriptionExpiresAt?: number | null;
  now?: number;
}): void {
  const max = maxVideoDurationSecForPlan(args);
  if (!Number.isFinite(args.durationSec) || args.durationSec < 0) {
    throw new Error("Video duration is invalid.");
  }
  if (args.durationSec > max) {
    const limitLabel = max === PREMIUM_MAX_VIDEO_DURATION_SEC ? "3 minutes 5 seconds" : "20 seconds";
    const tier = max === PREMIUM_MAX_VIDEO_DURATION_SEC ? "Premium" : "current Free";
    throw new Error(`Your video is longer than the ${tier} limit of ${limitLabel}.`);
  }
}
