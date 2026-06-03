"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import Stripe from "stripe";
import { api } from "./_generated/api";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2022-11-15",
});

export const createCheckout = action({
  args: { email: v.string(), tokens: v.number() },
  handler: async (_, args) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Stripe secret not configured");
    }

    const unitAmount = Math.max(100, Math.round(args.tokens * 100));
    const frontendUrl = process.env.FRONTEND_URL || "https://www.giga3ai.com";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Giga3 AI Tokens (${args.tokens})` },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      customer_email: args.email,
      success_url: `${frontendUrl}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/pricing.html`,
      metadata: { email: args.email, tokens: String(args.tokens) },
    });

    return { url: session.url };
  },
});

export const confirmPurchase = action({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Stripe secret not configured");
    }
    const session = await stripe.checkout.sessions.retrieve(args.sessionId, {
      expand: ["payment_status"],
    });
    if (!session || session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    const email =
      (session.metadata as { email?: string })?.email ||
      session.customer_details?.email;
    const tokens = Number((session.metadata as { tokens?: string })?.tokens || 0);
    if (!email || tokens <= 0) throw new Error("Invalid session metadata");

    const balance = await ctx.runMutation(api.payments.grantPurchaseTokens, {
      email,
      tokens,
      reference: args.sessionId,
    });

    return { email, tokens: balance };
  },
});
