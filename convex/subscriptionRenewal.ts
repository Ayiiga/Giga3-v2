import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import {
  getFrontendBaseUrl,
  isEmailDeliveryConfigured,
  sendEmail,
  wrapEmailHtml,
} from "./emailClient";
import { paystackPost, toPesewas } from "./paystack";
import {
  getPlanMonthlyCredits,
  getPlanPriceGhs,
  SUBSCRIPTION_PLANS,
  type PaidPlanId,
} from "./subscriptionPlans";
import {
  decideRenewal,
  describePaymentMethod,
  RENEWAL_REMINDER_LEAD_MS,
  renewalReference,
} from "./subscriptionRenewalLogic";

const PAID_PLAN_IDS = new Set<string>(Object.keys(SUBSCRIPTION_PLANS));

function isPaidPlanId(value: string): value is PaidPlanId {
  return PAID_PLAN_IDS.has(value);
}

/** Upsert a reusable Paystack authorization for later automatic charges. */
export const saveAuthorization = internalMutation({
  args: {
    userId: v.string(),
    sourceReference: v.string(),
    authorizationCode: v.string(),
    reusable: v.boolean(),
    channel: v.string(),
    brand: v.optional(v.string()),
    cardType: v.optional(v.string()),
    last4: v.optional(v.string()),
    expMonth: v.optional(v.string()),
    expYear: v.optional(v.string()),
    bank: v.optional(v.string()),
    signature: v.optional(v.string()),
    customerEmail: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.reusable) return { saved: false as const };
    const now = Date.now();
    const existing = await ctx.db
      .query("billingAuthorizations")
      .withIndex("by_user_code", (q) =>
        q.eq("userId", args.userId).eq("authorizationCode", args.authorizationCode)
      )
      .first();
    const fields = {
      channel: args.channel,
      reusable: args.reusable,
      brand: args.brand,
      cardType: args.cardType,
      last4: args.last4,
      expMonth: args.expMonth,
      expYear: args.expYear,
      bank: args.bank,
      signature: args.signature,
      customerEmail: args.customerEmail,
      sourceReference: args.sourceReference,
      updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, fields);
      return { saved: true as const, id: existing._id };
    }
    const id = await ctx.db.insert("billingAuthorizations", {
      userId: args.userId,
      provider: "paystack",
      authorizationCode: args.authorizationCode,
      createdAt: now,
      ...fields,
    });
    return { saved: true as const, id };
  },
});

/** Paid users whose period ends within the reminder window, plus their saved method. */
export const listRenewalCandidates = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const horizon = args.now + RENEWAL_REMINDER_LEAD_MS;
    const users = await ctx.db
      .query("users")
      .withIndex("by_subscription_expiry", (q) =>
        q.gt("subscriptionExpiresAt", args.now).lte("subscriptionExpiresAt", horizon)
      )
      .collect();

    const candidates = [];
    for (const user of users) {
      if (!user.subscriptionPlan || user.subscriptionPlan === "free") continue;
      const method = await ctx.db
        .query("billingAuthorizations")
        .withIndex("by_user", (q) => q.eq("userId", user.email))
        .order("desc")
        .first();
      const active = await ctx.db
        .query("subscriptions")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", user.email).eq("status", "active")
        )
        .first();
      candidates.push({
        email: user.email,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionExpiresAt: user.subscriptionExpiresAt ?? null,
        autoRenew: user.autoRenew ?? null,
        renewalFailures: user.renewalFailures ?? 0,
        lastRenewalAttemptAt: user.lastRenewalAttemptAt ?? null,
        renewalReminderSentAt: user.renewalReminderSentAt ?? null,
        complimentary: active?.source === "complimentary",
        method: method
          ? {
              authorizationCode: method.authorizationCode,
              reusable: method.reusable,
              channel: method.channel,
              brand: method.brand ?? null,
              cardType: method.cardType ?? null,
              last4: method.last4 ?? null,
              bank: method.bank ?? null,
              customerEmail: method.customerEmail,
            }
          : null,
      });
    }
    return candidates;
  },
});

export const beginRenewalCharge = internalMutation({
  args: {
    email: v.string(),
    planId: v.string(),
    reference: v.string(),
    amountGhs: v.number(),
    credits: v.number(),
  },
  handler: async (ctx, args) => {
    if (!isPaidPlanId(args.planId)) throw new Error(`Not a paid plan: ${args.planId}`);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, { lastRenewalAttemptAt: Date.now() });
    await ctx.runMutation(internal.paystack.createPendingPayment, {
      userId: args.email,
      reference: args.reference,
      productId: SUBSCRIPTION_PLANS[args.planId].productId,
      type: "subscription",
      amountGhs: args.amountGhs,
      planId: args.planId,
      creditsGranted: args.credits,
      isRenewal: true,
    });
  },
});

export const recordRenewalFailure = internalMutation({
  args: { email: v.string(), reference: v.string(), response: v.string() },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.paystack.markPaymentFailed, {
      reference: args.reference,
      paystackResponse: args.response,
    });
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) return { failures: 0 };
    const failures = (user.renewalFailures ?? 0) + 1;
    await ctx.db.patch(user._id, { renewalFailures: failures });
    return { failures };
  },
});

export const markReminderSent = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (user) await ctx.db.patch(user._id, { renewalReminderSentAt: Date.now() });
  },
});

function planLabel(planId: string): string {
  return isPaidPlanId(planId) ? SUBSCRIPTION_PLANS[planId].label : planId;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

async function notify(
  to: string,
  subject: string,
  title: string,
  bodyHtml: string,
  tag: string
) {
  if (!isEmailDeliveryConfigured()) return;
  try {
    await sendEmail({
      to,
      subject,
      html: wrapEmailHtml({ title, bodyHtml }),
      tags: [{ name: "category", value: tag }],
    });
  } catch (err) {
    console.warn("[renewal] email failed:", err);
  }
}

/**
 * Daily job: charge saved cards for periods ending soon, remind users whose
 * method cannot be reused (mobile money), and never touch complimentary or
 * opted-out accounts.
 */
export const processDueRenewals = internalAction({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    const dryRun = args.dryRun === true;
    const wallet = `${getFrontendBaseUrl()}/wallet/`;
    const candidates = await ctx.runQuery(internal.subscriptionRenewal.listRenewalCandidates, {
      now,
    });

    const summary = {
      considered: candidates.length,
      charged: 0,
      failed: 0,
      reminded: 0,
      skipped: [] as { email: string; reason: string }[],
      planned: [] as { email: string; action: string }[],
    };

    for (const c of candidates) {
      if (c.complimentary) {
        summary.skipped.push({ email: c.email, reason: "complimentary" });
        continue;
      }
      const hasReusable = Boolean(c.method?.reusable && c.method.authorizationCode);
      const decision = decideRenewal(c, hasReusable, now);

      if (decision.action === "skip") {
        summary.skipped.push({ email: c.email, reason: decision.reason });
        continue;
      }

      if (decision.action === "remind") {
        if (c.renewalReminderSentAt && now - c.renewalReminderSentAt < RENEWAL_REMINDER_LEAD_MS) {
          summary.skipped.push({ email: c.email, reason: "reminder_already_sent" });
          continue;
        }
        if (dryRun) {
          summary.planned.push({ email: c.email, action: "remind" });
          continue;
        }
        await notify(
          c.email,
          `Your Giga3 AI ${planLabel(c.subscriptionPlan)} plan ends soon`,
          "Renew your plan",
          `<p>Your <strong>${planLabel(c.subscriptionPlan)}</strong> plan ends on <strong>${formatDate(
            c.subscriptionExpiresAt ?? now
          )}</strong>.</p>
           <p>Mobile money payments cannot be charged automatically, so please renew from your wallet to keep your monthly credits.</p>
           <p><a href="${wallet}" style="display:inline-block;padding:12px 20px;background:#4c1d95;color:#fff;border-radius:10px;text-decoration:none;">Renew now</a></p>`,
          "renewal_reminder"
        );
        await ctx.runMutation(internal.subscriptionRenewal.markReminderSent, { email: c.email });
        summary.reminded += 1;
        continue;
      }

      // decision.action === "charge"
      if (!isPaidPlanId(c.subscriptionPlan) || !c.method) {
        summary.skipped.push({ email: c.email, reason: "invalid_plan" });
        continue;
      }
      if (dryRun) {
        summary.planned.push({
          email: c.email,
          action: `charge ${c.subscriptionPlan} via ${describePaymentMethod(c.method)}`,
        });
        continue;
      }

      const planId = c.subscriptionPlan;
      const amountGhs = getPlanPriceGhs(planId);
      const credits = getPlanMonthlyCredits(planId);
      const reference = renewalReference(planId, now, Math.random().toString(36).slice(2, 9));

      await ctx.runMutation(internal.subscriptionRenewal.beginRenewalCharge, {
        email: c.email,
        planId,
        reference,
        amountGhs,
        credits,
      });

      let responseData: { status?: string; gateway_response?: string } = {};
      let ok = false;
      try {
        const res = await paystackPost("/transaction/charge_authorization", {
          email: c.method.customerEmail || c.email,
          amount: toPesewas(amountGhs),
          currency: "GHS",
          authorization_code: c.method.authorizationCode,
          reference,
          metadata: {
            userId: c.email,
            productId: SUBSCRIPTION_PLANS[planId].productId,
            renewal: true,
          },
        });
        responseData = (res.data ?? {}) as typeof responseData;
        ok = responseData.status === "success";
      } catch (err) {
        responseData = {
          status: "failed",
          gateway_response: err instanceof Error ? err.message : "charge failed",
        };
      }

      if (ok) {
        await ctx.runMutation(internal.paystack.fulfillPayment, {
          reference,
          paystackResponse: JSON.stringify(responseData),
        });
        summary.charged += 1;
        await notify(
          c.email,
          `Giga3 AI ${planLabel(planId)} renewed — GHS ${amountGhs}`,
          "Subscription renewed",
          `<p>Your <strong>${planLabel(planId)}</strong> plan was renewed for <strong>GHS ${amountGhs}</strong> using ${describePaymentMethod(
            c.method
          )}. ${credits} credits have been added for the new period.</p>
           <p>Reference: <code>${reference}</code></p>
           <p>You can turn off automatic renewal any time from <a href="${wallet}">your wallet</a>.</p>`,
          "renewal_receipt"
        );
      } else {
        const result = await ctx.runMutation(internal.subscriptionRenewal.recordRenewalFailure, {
          email: c.email,
          reference,
          response: JSON.stringify(responseData),
        });
        summary.failed += 1;
        await notify(
          c.email,
          `We couldn't renew your Giga3 AI ${planLabel(planId)} plan`,
          "Renewal payment failed",
          `<p>We tried to charge ${describePaymentMethod(c.method)} for your <strong>${planLabel(
            planId
          )}</strong> plan but the payment did not go through${
            responseData.gateway_response ? ` (${responseData.gateway_response})` : ""
          }.</p>
           <p>Your plan ends on <strong>${formatDate(
             c.subscriptionExpiresAt ?? now
           )}</strong>. ${
             result.failures >= 3
               ? "We will not retry automatically — please renew from your wallet."
               : "We will try again tomorrow, or you can renew now from your wallet."
           }</p>
           <p><a href="${wallet}" style="display:inline-block;padding:12px 20px;background:#4c1d95;color:#fff;border-radius:10px;text-decoration:none;">Open wallet</a></p>`,
          "renewal_failed"
        );
      }
    }

    console.log("[renewal] summary", JSON.stringify(summary));
    return summary;
  },
});
