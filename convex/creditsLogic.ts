import { FREE_STARTER_CREDITS } from "./subscriptionPlans";

export { FREE_STARTER_CREDITS };

/** Never expose undefined or negative balances to callers. */
export function normalizeCredits(credits: number | undefined | null): number {
  if (credits == null || !Number.isFinite(credits)) return 0;
  return Math.max(0, credits);
}

/**
 * When `CREDITS_BYPASS_DEV=true`, chat/media credit deductions are skipped.
 * Intended for local dev and Cloud Agent smoke tests only — never enable in production.
 */
export function isCreditsBypassEnabled(): boolean {
  return process.env.CREDITS_BYPASS_DEV === "true";
}

export type CreditDbCtx = {
  db: {
    patch: (id: unknown, patch: Record<string, unknown>) => Promise<void>;
    insert: (table: string, doc: Record<string, unknown>) => Promise<unknown>;
  };
};

type StarterGrantUser = {
  _id: unknown;
  email: string;
  credits?: number;
  starterCreditsGranted?: boolean;
};

/**
 * One-time onboarding grant. Idempotent via `starterCreditsGranted`.
 * Users who already have a positive balance (e.g. legacy purchases) only get the flag set.
 */
export async function applyStarterGrantIfNeeded(
  ctx: CreditDbCtx,
  user: StarterGrantUser,
  logCredit: (args: {
    userId: string;
    action: "starter_grant";
    amount: number;
    balanceAfter: number;
    reference?: string;
  }) => Promise<void>
): Promise<number> {
  if (user.starterCreditsGranted) {
    const normalized = normalizeCredits(user.credits);
    if (normalized !== user.credits) {
      await ctx.db.patch(user._id, { credits: normalized });
    }
    return normalized;
  }

  const current = normalizeCredits(user.credits);
  if (current > 0) {
    await ctx.db.patch(user._id, { starterCreditsGranted: true, credits: current });
    return current;
  }

  const balanceAfter = FREE_STARTER_CREDITS;
  await ctx.db.patch(user._id, {
    credits: balanceAfter,
    starterCreditsGranted: true,
  });
  await logCredit({
    userId: user.email,
    action: "starter_grant",
    amount: FREE_STARTER_CREDITS,
    balanceAfter,
    reference: "onboarding",
  });
  return balanceAfter;
}
