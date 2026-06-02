import { action, mutation } from "./_generated/server";
import { v } from "convex/values";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2022-11-15" });

// Adds tokens directly (admin or webhook use)
export const addTokens = mutation({
	args: { email: v.string(), tokens: v.number() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.filter((q) => q.eq(q.field("email"), args.email))
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

// Create a Stripe Checkout session and return url
export const createCheckout = action({
	args: { email: v.string(), tokens: v.number() },
	handler: async (_, args) => {
		if (!process.env.STRIPE_SECRET_KEY) {
			throw new Error("Stripe secret not configured");
		}

		const unitAmount = Math.max(100, Math.round(args.tokens * 100)); // $1/token minimum

const frontendUrl = process.env.FRONTEND_URL || "https://www.giga3ai.com";
+	const session = await stripe.checkout.sessions.create({
+		payment_method_types: ["card"],
+		mode: "payment",
+		line_items: [
+			{
+				price_data: {
+					currency: "usd",
+					product_data: { name: `Giga3 AI Tokens (${args.tokens})` },
+					unit_amount: unitAmount,
+				},
+				quantity: 1,
+			},
+		],
+		customer_email: args.email,
+		success_url: `${frontendUrl}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
+		cancel_url: `${frontendUrl}/pricing.html`,
+		metadata: { email: args.email, tokens: String(args.tokens) },
+	});

		return { url: session.url };
	},
});

// Confirm payment by session id and grant tokens
export const confirmPurchase = action({
	args: { sessionId: v.string() },
	handler: async (ctx, args) => {
		if (!process.env.STRIPE_SECRET_KEY) {
			throw new Error("Stripe secret not configured");
		}
		const session = await stripe.checkout.sessions.retrieve(args.sessionId as string, { expand: ["payment_status"] });
		if (!session || session.payment_status !== "paid") {
			throw new Error("Payment not completed");
		}

		const email = (session.metadata as any)?.email || session.customer_details?.email;
		const tokens = Number((session.metadata as any)?.tokens || 0);
		if (!email || tokens <= 0) throw new Error("Invalid session metadata");

		let user = await ctx.runQuery(api.users.getUser, { email });
		if (!user) {
			await ctx.runMutation(api.users.createUser, { email });
		}

		await ctx.runMutation(api.payments.addTokens, { email, tokens });
		const updated = await ctx.runQuery(api.users.getUser, { email });

		return { email, tokens: updated?.tokens ?? tokens };
	},
});