import type { ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { CREDIT_COSTS } from "./creditsConfig";

export type MediaCreditAction = "image" | "video";

/** Read-only balance check — does not deduct. */
export async function assertCreditsAvailable(
  ctx: ActionCtx,
  sessionToken: string,
  action: MediaCreditAction
): Promise<number> {
  const usage = await ctx.runQuery(api.credits.getUsageSnapshot, { sessionToken });
  if (!usage) throw new Error("User not found");
  const cost = CREDIT_COSTS[action];
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
  jobId: string
): Promise<void> {
  await ctx.runMutation(api.credits.deductCredits, {
    sessionToken,
    action,
    reference: jobId,
    metadata: JSON.stringify({ source: "media_studio" }),
  });
}
