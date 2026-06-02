import { action, internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2022-11-15",
});

export const addTokens = mutation({
  args: { email: v.string(), tokens: v.number() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) {
      throw new Error("User not found");
    }
    await ctx.db.patch(user._id, { tokens: (user.tokens ?? 0) + args.tokens });
    await ctx.db.insert("transactions", {
      userId: args.email,
      amount: args.tokens,
      reference: "manual_add",
      tokens: args.tokens,
    });
  },
});

export const grantTokensFromStripe = internalMutation({
  args: {
    email: v.string(),
    tokens: v.number(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      const userId = await ctx.db.insert("users", {
        email: args.email,
        tokens: 0,
        plan: "paid",
        tier: "free",
        credits: 0,
      });
      user = await ctx.db.get(userId);
      if (!user) throw new Error("Failed to create user");
    }

    const newTokens = (user.tokens ?? 0) + args.tokens;
    await ctx.db.patch(user._id, { tokens: newTokens });
    await ctx.db.insert("transactions", {
      userId: args.email,
      amount: args.tokens,
      reference: args.sessionId,
      tokens: args.tokens,
    });

    return { email: args.email, tokens: newTokens };
  },
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
      success_url: `${frontendUrl}/payment/success/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/pricing/`,
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
      expand: ["payment_intent"],
    });

    if (!session || session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    const email =
      session.metadata?.email ?? session.customer_details?.email ?? undefined;
    const tokens = Number(session.metadata?.tokens ?? 0);
    if (!email || tokens <= 0) {
      throw new Error("Invalid session metadata");
    }

    return await ctx.runMutation(internal.payments.grantTokensFromStripe, {
      email,
      tokens,
      sessionId: args.sessionId,
    });
  },
});
