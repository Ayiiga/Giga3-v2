/**
 * Pure helpers for subscription auto-renewal — no Convex imports so they can be
 * unit-tested directly.
 */

/** Start charging this long before the current period ends (daily cron → up to 3 tries). */
export const RENEWAL_LEAD_MS = 2 * 24 * 60 * 60 * 1000;
/** Do not retry a failed charge more often than this. */
export const RENEWAL_RETRY_COOLDOWN_MS = 20 * 60 * 60 * 1000;
/** After this many consecutive failures we stop charging and let the plan lapse. */
export const RENEWAL_MAX_FAILURES = 3;
/** Send the "renew manually" reminder for non-reusable methods this far ahead. */
export const RENEWAL_REMINDER_LEAD_MS = 3 * 24 * 60 * 60 * 1000;

export type PaystackAuthorization = {
  authorization_code?: string;
  reusable?: boolean;
  channel?: string;
  card_type?: string;
  last4?: string;
  exp_month?: string;
  exp_year?: string;
  bank?: string;
  brand?: string;
  signature?: string;
};

export type ExtractedAuthorization = {
  authorizationCode: string;
  reusable: boolean;
  channel: string;
  brand?: string;
  cardType?: string;
  last4?: string;
  expMonth?: string;
  expYear?: string;
  bank?: string;
  signature?: string;
  customerEmail?: string;
};

/**
 * Pull the reusable authorization out of either a `transaction/verify` `data`
 * object or a full webhook event (`{ event, data }`). Returns null when the
 * method cannot be charged again (e.g. Ghana mobile money).
 */
export function extractReusableAuthorization(
  paystackResponse: string
): ExtractedAuthorization | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(paystackResponse);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const root = parsed as {
    authorization?: PaystackAuthorization;
    customer?: { email?: string };
    data?: { authorization?: PaystackAuthorization; customer?: { email?: string } };
  };
  const data = root.data && typeof root.data === "object" ? root.data : root;
  const auth = data.authorization;
  if (!auth || typeof auth !== "object") return null;
  if (auth.reusable !== true) return null;
  const code = auth.authorization_code?.trim();
  if (!code || !code.startsWith("AUTH_")) return null;

  const clean = (value?: string) => (value && value.trim() ? value.trim() : undefined);
  return {
    authorizationCode: code,
    reusable: true,
    channel: clean(auth.channel) ?? "card",
    brand: clean(auth.brand),
    cardType: clean(auth.card_type),
    last4: clean(auth.last4),
    expMonth: clean(auth.exp_month),
    expYear: clean(auth.exp_year),
    bank: clean(auth.bank),
    signature: clean(auth.signature),
    customerEmail: clean(data.customer?.email)?.toLowerCase(),
  };
}

export type RenewalCandidate = {
  subscriptionPlan: string;
  subscriptionExpiresAt?: number | null;
  autoRenew?: boolean | null;
  renewalFailures?: number | null;
  lastRenewalAttemptAt?: number | null;
};

export type RenewalDecision =
  | { action: "skip"; reason: string }
  | { action: "charge" }
  | { action: "remind" };

/**
 * Decide what the daily renewal job should do for a user.
 * `hasReusableMethod` is whether a stored, reusable authorization exists.
 */
export function decideRenewal(
  user: RenewalCandidate,
  hasReusableMethod: boolean,
  now: number
): RenewalDecision {
  if (!user.subscriptionPlan || user.subscriptionPlan === "free") {
    return { action: "skip", reason: "free_plan" };
  }
  const expiresAt = user.subscriptionExpiresAt ?? 0;
  if (!expiresAt) return { action: "skip", reason: "no_expiry" };
  if (user.autoRenew === false) return { action: "skip", reason: "auto_renew_off" };
  if (expiresAt <= now) return { action: "skip", reason: "already_expired" };

  if (!hasReusableMethod) {
    return expiresAt - now <= RENEWAL_REMINDER_LEAD_MS
      ? { action: "remind" }
      : { action: "skip", reason: "not_due" };
  }

  if (expiresAt - now > RENEWAL_LEAD_MS) return { action: "skip", reason: "not_due" };
  if ((user.renewalFailures ?? 0) >= RENEWAL_MAX_FAILURES) {
    return { action: "skip", reason: "max_failures" };
  }
  const last = user.lastRenewalAttemptAt ?? 0;
  if (last && now - last < RENEWAL_RETRY_COOLDOWN_MS) {
    return { action: "skip", reason: "cooldown" };
  }
  return { action: "charge" };
}

export function renewalReference(planId: string, now: number, rand: string): string {
  return `giga3_renew_${planId}_${now}_${rand}`;
}

export function isRenewalReference(reference: string): boolean {
  return reference.startsWith("giga3_renew_");
}

/** "Visa •••• 4242" style label — safe for clients (no authorization code). */
export function describePaymentMethod(method: {
  channel: string;
  brand?: string | null;
  cardType?: string | null;
  last4?: string | null;
  bank?: string | null;
}): string {
  const brand = (method.brand || method.cardType || "").trim();
  const pretty = brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : "";
  if (method.channel === "card") {
    const name = pretty || "Card";
    return method.last4 ? `${name} •••• ${method.last4}` : name;
  }
  if (method.channel === "mobile_money") {
    return method.bank ? `Mobile money (${method.bank})` : "Mobile money";
  }
  return pretty || method.channel.replace(/_/g, " ");
}
