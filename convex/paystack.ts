import { action, internalMutation, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

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

export const getPaymentByReference = query({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("paymentRecords")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .first();
  },
});

export const createPendingPayment = internalMutation({
  args: {
    userId: v.string(),
    reference: v.string(),
    type: v.union(v.literal("subscription"), v.literal("credits")),
    amountGhs: v.number(),
    creditsGranted: v.optional(v.number()),
    tierGranted: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("paymentRecords", {
      userId: args.userId,
      provider: "paystack",
      reference: args.reference,
      type: args.type,
      amountGhs: args.amountGhs,
      creditsGranted: args.creditsGranted,
      tierGranted: args.tierGranted,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const markPaymentSuccess = internalMutation({
  args: {
    reference: v.string(),
    paystackResponse: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("paymentRecords")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .first();
    if (!record) throw new Error("Payment record not found");
    if (record.status === "success") return record;

    await ctx.db.patch(record._id, {
      status: "success",
      paystackResponse: args.paystackResponse,
    });

    if (record.type === "credits" && record.creditsGranted) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", record.userId))
        .first();
      if (user) {
        await ctx.db.patch(user._id, {
          credits: (user.credits ?? 0) + record.creditsGranted,
        });
      }
    }

    if (record.type === "subscription") {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", record.userId))
        .first();
      if (user) {
        const base = Math.max(user.subscriptionExpiresAt ?? Date.now(), Date.now());
        await ctx.db.patch(user._id, {
          tier: "premium",
          plan: "premium",
          subscriptionExpiresAt: base + 30 * 24 * 60 * 60 * 1000,
        });
      }
    }

    return record;
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
    const frontend = process.env.FRONTEND_URL ?? "http://127.0.0.1:3000";

    await ctx.runMutation(internal.paystack.createPendingPayment, {
      userId: args.userId,
      reference,
      type: catalog.type,
      amountGhs: catalog.amountGhs,
      creditsGranted: catalog.credits,
      tierGranted: catalog.type === "subscription" ? "premium" : undefined,
    });

    const init = await paystackPost("/transaction/initialize", {
      email: args.email,
      amount: toPesewas(catalog.amountGhs),
      currency: "GHS",
      reference,
      callback_url: `${frontend}/payment/success?reference=${encodeURIComponent(reference)}`,
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

    const data = verified.data;
    if (data.status !== "success") {
      throw new Error("Payment not successful");
    }

    await ctx.runMutation(internal.paystack.markPaymentSuccess, {
      reference: args.reference,
      paystackResponse: JSON.stringify(data),
    });

    const record = await ctx.runQuery(api.paystack.getPaymentByReference, {
      reference: args.reference,
    });

    return {
      status: "success" as const,
      type: record?.type,
      creditsGranted: record?.creditsGranted,
    };
  },
});

function getProduct(productId: string) {
  const products: Record<
    string,
    {
      label: string;
      amountGhs: number;
      type: "subscription" | "credits";
      credits?: number;
    }
  > = {
    premium_monthly: {
      label: "Premium Monthly",
      amountGhs: Number(process.env.PAYSTACK_PREMIUM_GHS ?? "49"),
      type: "subscription",
    },
    credits_50: {
      label: "50 Credits",
      amountGhs: Number(process.env.PAYSTACK_CREDITS_50_GHS ?? "25"),
      type: "credits",
      credits: 50,
    },
    credits_150: {
      label: "150 Credits",
      amountGhs: Number(process.env.PAYSTACK_CREDITS_150_GHS ?? "65"),
      type: "credits",
      credits: 150,
    },
    credits_500: {
      label: "500 Credits",
      amountGhs: Number(process.env.PAYSTACK_CREDITS_500_GHS ?? "199"),
      type: "credits",
      credits: 500,
    },
  };

  const product = products[productId];
  if (!product) throw new Error("Unknown product");
  return product;
}
