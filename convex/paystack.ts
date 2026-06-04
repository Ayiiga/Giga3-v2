import {
  action,
  httpAction,
  internalMutation,
  query,
} from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { getCreditPack } from "./creditPacks";
import {
  getPlanMonthlyCredits,
  getPlanPriceGhs,
  productIdToPlanId,
  SUBSCRIPTION_PLANS,
  type PaidPlanId,
} from "./subscriptionPlans";
import {
  assertPaystackProductionReady,
  getPaystackMode,
  getPaystackSecret,
  parsePaystackAmountPesewas,
} from "./paystackConfig";

const PAYSTACK_BASE = "https://api.paystack.co";

function paystackSecret(): string {
  const key = getPaystackSecret();
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return key;
}

function validatePaymentAmount(record: { amountGhs: number }, paystackResponse: string) {
  const pesewas = parsePaystackAmountPesewas(paystackResponse);
  if (pesewas === null) {
    console.warn("[paystack] Could not parse amount from Paystack response for reconciliation");
    return;
  }
  const expected = toPesewas(record.amountGhs);
  if (pesewas !== expected) {
    throw new Error(
      `Payment amount mismatch: expected ${expected} pesewas, got ${pesewas}`
    );
  }
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
    const amountGhs = getPlanPriceGhs(planId);
    return {
      label: SUBSCRIPTION_PLANS[planId].label,
      amountGhs,
      type: "subscription" as const,
      planId,
      credits: getPlanMonthlyCredits(planId),
    };
  }

  const pack = getCreditPack(productId);
  if (!pack) throw new Error("Unknown product");
  return {
    label: pack.label,
    amountGhs: pack.amountGhs,
    type: pack.type,
    credits: pack.credits,
    planId: undefined,
  };
}

function paystackKeyMode(key: string): "live" | "test" | "unknown" {
  if (key.startsWith("pk_live_") || key.startsWith("sk_live_")) return "live";
  if (key.startsWith("pk_test_") || key.startsWith("sk_test_")) return "test";
  return "unknown";
}

/** Public checkout config for Paystack Inline (popup). Secret key stays server-only. */
export const getClientConfig = query({
  args: {},
  handler: async () => {
    const publicKey = process.env.PAYSTACK_PUBLIC_KEY?.trim();
    if (!publicKey) {
      return { enabled: false as const };
    }
    const mode = paystackKeyMode(publicKey);
    const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
    const keyMismatch =
      Boolean(secret) &&
      paystackKeyMode(secret) !== "unknown" &&
      mode !== "unknown" &&
      paystackKeyMode(secret) !== mode;

    return {
      enabled: true as const,
      publicKey,
      mode,
      currency: "GHS" as const,
      keyMismatch,
    };
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

/** Client-safe Paystack configuration status (no secrets). */
export const getPaystackStatus = query({
  args: {},
  handler: async () => {
    const mode = getPaystackMode();
    const requireLive = process.env.PAYSTACK_REQUIRE_LIVE === "true";
    const frontend = process.env.FRONTEND_URL ?? "https://www.giga3ai.com";
    return {
      mode,
      requireLive,
      frontendUrl: frontend,
      liveReady: mode === "live",
      webhookPath: "/paystack/webhook",
    };
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
    /** When false, log amount mismatches but still fulfill (webhook recovery). */
    strictAmountCheck: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("payments")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .first();
    if (!record) throw new Error("Payment record not found");
    if (record.status === "success") return { alreadyFulfilled: true as const };

    const strict = args.strictAmountCheck !== false;
    try {
      validatePaymentAmount(record, args.paystackResponse);
    } catch (amountErr) {
      console.error("[paystack] amount validation:", amountErr);
      if (strict) throw amountErr;
    }

    await ctx.db.patch(record._id, {
      status: "success",
      paystackResponse: args.paystackResponse,
    });

    if (record.type === "subscription" && record.planId) {
      const planId = record.planId as PaidPlanId;
      const creditsToGrant =
        record.creditsGranted ?? getPlanMonthlyCredits(planId);
      await ctx.runMutation(internal.subscriptions.activateSubscription, {
        userId: record.userId,
        planId: record.planId,
        paystackReference: record.reference,
        paymentId: record._id,
        creditsToGrant,
      });
      await ctx.runMutation(internal.credits.grantCreditsInternal, {
        userId: record.userId,
        credits: creditsToGrant,
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

export const markPaymentFailed = internalMutation({
  args: {
    reference: v.string(),
    paystackResponse: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("payments")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .first();
    if (!record || record.status === "success") return { updated: false as const };
    await ctx.db.patch(record._id, {
      status: "failed",
      paystackResponse: args.paystackResponse,
    });
    return { updated: true as const };
  },
});

export const initializePayment = action({
  args: {
    userId: v.string(),
    email: v.string(),
    productId: v.string(),
  },
  handler: async (ctx, args) => {
    assertPaystackProductionReady();
    const email = args.email.trim().toLowerCase();
    const userId = args.userId.trim().toLowerCase();
    if (!email.includes("@")) {
      throw new Error("A valid email is required for checkout");
    }

    const catalog = getProduct(args.productId);
    if (catalog.amountGhs <= 0) {
      throw new Error("Invalid product price");
    }

    const reference = `giga3_${args.productId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const frontend = process.env.FRONTEND_URL ?? "https://www.giga3ai.com";
    const mode = getPaystackMode();

    await ctx.runMutation(internal.paystack.createPendingPayment, {
      userId,
      reference,
      productId: args.productId,
      type: catalog.type,
      amountGhs: catalog.amountGhs,
      planId: catalog.planId,
      creditsGranted: catalog.credits,
    });

    const init = await paystackPost("/transaction/initialize", {
      email,
      amount: toPesewas(catalog.amountGhs),
      currency: "GHS",
      reference,
      callback_url: `${frontend}/payment/success/?reference=${encodeURIComponent(reference)}`,
      metadata: {
        userId,
        productId: args.productId,
        paystack_mode: mode,
        custom_fields: [
          { display_name: "Product", variable_name: "product", value: catalog.label },
          {
            display_name: "Amount (GHS)",
            variable_name: "amount_ghs",
            value: String(catalog.amountGhs),
          },
        ],
      },
    });

    const authorizationUrl = init.data?.authorization_url as string | undefined;
    const accessCode = init.data?.access_code as string | undefined;
    if (!authorizationUrl?.trim()) {
      throw new Error("Paystack did not return a checkout URL. Please try again.");
    }

    return {
      authorizationUrl,
      accessCode: accessCode?.trim() ?? "",
      reference,
      amountGhs: catalog.amountGhs,
      label: catalog.label,
      mode,
    };
  },
});

async function verifyAndFulfill(
  ctx: ActionCtx,
  reference: string
): Promise<Doc<"payments"> | null> {
  const verified = await paystackGet(
    `/transaction/verify/${encodeURIComponent(reference)}`
  );

  if (verified.data.status !== "success") {
    await ctx.runMutation(internal.paystack.markPaymentFailed, {
      reference,
      paystackResponse: JSON.stringify(verified.data),
    });
    throw new Error("Payment not successful");
  }

  await ctx.runMutation(internal.paystack.fulfillPayment, {
    reference,
    paystackResponse: JSON.stringify(verified.data),
  });

  return await ctx.runQuery(api.paystack.getPaymentByReference, { reference });
}

export const verifyPayment = action({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    const record = await verifyAndFulfill(ctx, args.reference);

    return {
      status: "success" as const,
      type: record?.type,
      planId: record?.planId,
      creditsGranted: record?.creditsGranted,
    };
  },
});

/** Re-run Paystack verify for a pending payment (recovery after client/network errors). */
export const reconcilePayment = action({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.runQuery(api.paystack.getPaymentByReference, {
      reference: args.reference,
    });
    if (!existing) throw new Error("Payment reference not found");
    if (existing.status === "success") {
      return { status: "success" as const, alreadyFulfilled: true };
    }
    const record = await verifyAndFulfill(ctx, args.reference);
    return {
      status: "success" as const,
      alreadyFulfilled: false,
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

    const reference = event.data?.reference;
    if (!reference) {
      return { handled: false, reason: "missing_reference" };
    }

    if (event.event === "charge.failed") {
      await ctx.runMutation(internal.paystack.markPaymentFailed, {
        reference,
        paystackResponse: args.payload,
      });
      return { handled: true, reference, outcome: "failed" as const };
    }

    if (event.event !== "charge.success") {
      return { handled: false, reason: event.event ?? "unknown" };
    }

    if (event.data?.status && event.data.status !== "success") {
      return { handled: false, reason: `status_${event.data.status}` };
    }

    await ctx.runMutation(internal.paystack.fulfillPayment, {
      reference,
      paystackResponse: args.payload,
      strictAmountCheck: false,
    });

    return { handled: true, reference, outcome: "success" as const };
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
