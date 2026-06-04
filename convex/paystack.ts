import {
  action,
  httpAction,
  internalMutation,
  query,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import {
  getPlanPriceGhs,
  productIdToPlanId,
  SUBSCRIPTION_PLANS,
  type PaidPlanId,
} from "./subscriptionPlans";

const PAYSTACK_BASE = "https://api.paystack.co";

function paystackSecret(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return key;
}

function toPesewas(ghs: number): number {
  return Math.round(ghs * 100);
}

async function paystackPost(path: string, body: unknown) {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paystackSecret()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message ?? "Paystack request failed");
  }
  return data;
}

async function paystackGet(path: string) {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    headers: { Authorization: `Bearer ${paystackSecret()}` },
  });
  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message ?? "Paystack verify failed");
  }
  return data;
}

function getProduct(productId: string) {
  const planId = productIdToPlanId(productId);
  if (planId) {
    return {
      label: SUBSCRIPTION_PLANS[planId].label,
      amountGhs: getPlanPriceGhs(planId),
      type: "subscription" as const,
      planId,
      credits: SUBSCRIPTION_PLANS[planId].credits,
    };
  }

  const packs: Record<
    string,
    { label: string; amountGhs: number; credits: number }
  > = {
    credits_50: {
      label: "50 Credits",
      amountGhs: Number(process.env.PAYSTACK_CREDITS_50_GHS ?? "25"),
      credits: 50,
    },
    credits_150: {
      label: "150 Credits",
      amountGhs: Number(process.env.PAYSTACK_CREDITS_150_GHS ?? "65"),
      credits: 150,
    },
    credits_500: {
      label: "500 Credits",
      amountGhs: Number(process.env.PAYSTACK_CREDITS_500_GHS ?? "199"),
      credits: 500,
    },
  };

  const pack = packs[productId];
  if (!pack) throw new Error("Unknown product");
  return {
    label: pack.label,
    amountGhs: pack.amountGhs,
    type: "credits" as const,
    credits: pack.credits,
    planId: undefined,
  };
}

/** Public checkout config for Paystack Inline (popup). Secret key stays server-only. */
export const getClientConfig = query({
  args: {},
  handler: async () => {
    const publicKey = process.env.PAYSTACK_PUBLIC_KEY?.trim();
    if (!publicKey) {
      return { enabled: false as const };
    }
    const mode = publicKey.startsWith("pk_live_")
      ? ("live" as const)
      : publicKey.startsWith("pk_test_")
        ? ("test" as const)
        : ("unknown" as const);
    return { enabled: true as const, publicKey, mode, currency: "GHS" as const };
  },
});

export const getPaymentByReference = query({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payments")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .first();
  },
});

export const createPendingPayment = internalMutation({
  args: {
    userId: v.string(),
    reference: v.string(),
    productId: v.string(),
    type: v.union(v.literal("subscription"), v.literal("credits")),
    amountGhs: v.number(),
    planId: v.optional(
      v.union(v.literal("basic"), v.literal("pro"), v.literal("premium"))
    ),
    creditsGranted: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("payments", {
      userId: args.userId,
      provider: "paystack",
      reference: args.reference,
      productId: args.productId,
      type: args.type,
      amountGhs: args.amountGhs,
      planId: args.planId,
      creditsGranted: args.creditsGranted,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const fulfillPayment = internalMutation({
  args: {
    reference: v.string(),
    paystackResponse: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("payments")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .first();
    if (!record) throw new Error("Payment record not found");
    if (record.status === "success") return { alreadyFulfilled: true as const };

    await ctx.db.patch(record._id, {
      status: "success",
      paystackResponse: args.paystackResponse,
    });

    if (record.type === "subscription" && record.planId) {
      const plan = SUBSCRIPTION_PLANS[record.planId as PaidPlanId];
      await ctx.runMutation(internal.subscriptions.activateSubscription, {
        userId: record.userId,
        planId: record.planId,
        paystackReference: record.reference,
        paymentId: record._id,
        creditsToGrant: plan.credits,
      });
      await ctx.runMutation(internal.credits.grantCreditsInternal, {
        userId: record.userId,
        credits: plan.credits,
        action: "subscription_refill",
        reference: record.reference,
        setBalance: true,
      });
    } else if (record.type === "credits" && record.creditsGranted) {
      await ctx.runMutation(internal.credits.grantCreditsInternal, {
        userId: record.userId,
        credits: record.creditsGranted,
        action: "credit_purchase",
        reference: record.reference,
      });
    }

    return { alreadyFulfilled: false as const };
  },
});

export const initializePayment = action({
  args: {
    userId: v.string(),
    email: v.string(),
    productId: v.string(),
  },
  handler: async (ctx, args) => {
    const catalog = getProduct(args.productId);
    const reference = `giga3_${args.productId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const frontend = process.env.FRONTEND_URL ?? "https://www.giga3ai.com";

    await ctx.runMutation(internal.paystack.createPendingPayment, {
      userId: args.userId,
      reference,
      productId: args.productId,
      type: catalog.type,
      amountGhs: catalog.amountGhs,
      planId: catalog.planId,
      creditsGranted: catalog.credits,
    });

    const init = await paystackPost("/transaction/initialize", {
      email: args.email,
      amount: toPesewas(catalog.amountGhs),
      currency: "GHS",
      reference,
      callback_url: `${frontend}/payment/success/?reference=${encodeURIComponent(reference)}`,
      metadata: {
        userId: args.userId,
        productId: args.productId,
        custom_fields: [
          { display_name: "Product", variable_name: "product", value: catalog.label },
        ],
      },
    });

    return {
      authorizationUrl: init.data.authorization_url as string,
      accessCode: init.data.access_code as string,
      reference,
      amountGhs: catalog.amountGhs,
      label: catalog.label,
    };
  },
});

export const verifyPayment = action({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    const verified = await paystackGet(
      `/transaction/verify/${encodeURIComponent(args.reference)}`
    );

    if (verified.data.status !== "success") {
      throw new Error("Payment not successful");
    }

    await ctx.runMutation(internal.paystack.fulfillPayment, {
      reference: args.reference,
      paystackResponse: JSON.stringify(verified.data),
    });

    const record = await ctx.runQuery(api.paystack.getPaymentByReference, {
      reference: args.reference,
    });

    return {
      status: "success" as const,
      type: record?.type,
      planId: record?.planId,
      creditsGranted: record?.creditsGranted,
    };
  },
});

export const processWebhookPayload = internalMutation({
  args: { payload: v.string() },
  handler: async (ctx, args) => {
    const event = JSON.parse(args.payload) as {
      event?: string;
      data?: { reference?: string; status?: string };
    };

    if (event.event !== "charge.success") {
      return { handled: false, reason: event.event ?? "unknown" };
    }

    const reference = event.data?.reference;
    if (!reference) throw new Error("Missing reference in webhook");

    await ctx.runMutation(internal.paystack.fulfillPayment, {
      reference,
      paystackResponse: args.payload,
    });

    return { handled: true, reference };
  },
});

async function verifyPaystackSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const hex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === signature;
}

export const paystackWebhook = httpAction(async (ctx, request) => {
  const signature = request.headers.get("x-paystack-signature") ?? "";
  const payload = await request.text();

  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("PAYSTACK_SECRET_KEY is not configured");

    const valid = await verifyPaystackSignature(payload, signature, secret);
    if (!valid) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    await ctx.runMutation(internal.paystack.processWebhookPayload, { payload });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[paystack webhook]", err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : "Webhook error",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
});
