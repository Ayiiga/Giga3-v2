import type { ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { CREDIT_COSTS } from "./creditsConfig";
import { mediaVideoCreditCost } from "./mediaVideoCredits";

export type MediaCreditAction = "image" | "video";

/** Read-only balance check — does not deduct. */
export async function assertCreditsAvailable(
  ctx: ActionCtx,
  sessionToken: string,
  action: MediaCreditAction,
  options?: { videoDurationSec?: number }
): Promise<number> {
  const usage = await ctx.runQuery(api.credits.getUsageSnapshot, { sessionToken });
  if (!usage) throw new Error("User not found");
  const cost =
    action === "video" && options?.videoDurationSec !== undefined
      ? mediaVideoCreditCost(options.videoDurationSec)
      : CREDIT_COSTS[action];
  if (usage.credits < cost) {
    throw new Error(
      `Insufficient credits (${cost} required, ${usage.credits} available). Subscribe or renew to refill.`
    );
  }
  return cost;
}

/** Charge only after media generation succeeded. */
export async function chargeCreditsForMedia(
  ctx: ActionCtx,
  sessionToken: string,
  action: MediaCreditAction,
  jobId: string,
  creditAmount: number
): Promise<void> {
  await ctx.runMutation(api.credits.deductCredits, {
    sessionToken,
    action,
    reference: jobId,
    amount: creditAmount,
    metadata: JSON.stringify({ source: "media_studio", creditAmount }),
  });
}
